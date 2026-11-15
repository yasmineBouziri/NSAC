"""Offline personalized health assistant.

The engine deliberately keeps retrieval and inference behind one worker.  The
chat route cannot call the model without first building a user-scoped health
context.
"""
import hashlib
import json
import math
import os
import queue
import shutil
import sys
import subprocess
import threading
import time
import uuid
from pathlib import Path

INACTIVE_AFTER = 2 * 86400
_DLL_DIRECTORY_HANDLES = []

MANIFEST = {
    "name": "ai",
    "version": "0.1.0",
    "provides": ["POST /api/ai/chat", "GET /api/ai/status", "conversations", "local health RAG"],
}

SYSTEM_PROMPT = """You are Zibo, a concise and scientifically cautious local health-monitoring
assistant for an astronaut. Use the PERSONAL HEALTH CONTEXT supplied with every request silently.
Treat measured, self-reported, simulated, and inferred data differently. Consider timestamps,
units, freshness, confidence, and source limitations. Never invent readings, symptoms,
diagnoses, history, or trends. Missing data is not normal data. Do not claim causation from
correlation. Do not announce that you searched history, retrieved context, scored a previous
conversation, or know the user's past; use those details only when they genuinely help answer
the current message. Do not repeat the same disclaimer or generic invitation in every reply.
Respond naturally and specifically to what the user just said. When someone reports distress,
depression, hopelessness, or feeling unsafe, acknowledge the feeling first, ask a gentle
immediate-safety question when appropriate, encourage trusted human or medical support, and
give emergency guidance if there may be imminent danger. Do not minimize or diagnose.
Do not calculate or override the deterministic health score or alerts. For potentially urgent
symptoms, tell the user to seek immediate human medical assessment and follow the mission
emergency protocol. You are decision support, not a medical diagnostic system."""


class _Request:
    def __init__(self, uid):
        self.uid = uid
        self.body = {}
        self.query = {}


class _Stream:
    def __init__(self, chunks, status=200):
        self.chunks, self.status = chunks, status

    def __iter__(self):
        return iter(self.chunks)


def _json(value):
    return json.dumps(value, separators=(",", ":"), ensure_ascii=True)


def _vector(value):
    try:
        if isinstance(value, dict):
            value = value.get("embedding") or value.get("embeddings")
        if value and isinstance(value[0], list):
            value = value[0]
        return [float(x) for x in value]
    except (TypeError, ValueError, IndexError):
        return None


def _cosine(left, right):
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right))
    nl = math.sqrt(sum(a * a for a in left))
    nr = math.sqrt(sum(b * b for b in right))
    return dot / (nl * nr) if nl and nr else 0.0


def _gpu_info():
    if not shutil.which("nvidia-smi"):
        return {"available": False, "free_mb": 0, "total_mb": 0, "name": None}
    try:
        output = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.free,memory.total", "--format=csv,noheader,nounits"],
            text=True, stderr=subprocess.DEVNULL,
        ).strip().splitlines()[0].split(",")
        return {"available": True, "name": output[0].strip(), "free_mb": int(output[1]),
                "total_mb": int(output[2])}
    except (OSError, IndexError, ValueError, subprocess.SubprocessError):
        return {"available": False, "free_mb": 0, "total_mb": 0, "name": None}


def _llama_gpu_available():
    try:
        if os.name == "nt" and hasattr(os, "add_dll_directory"):
            nvidia = Path(sys.prefix) / "Lib" / "site-packages" / "nvidia"
            directories = {directory.parent for directory in nvidia.glob("**/*.dll") if directory.is_file()} if nvidia.is_dir() else set()
            for directory in directories:
                try:
                    _DLL_DIRECTORY_HANDLES.append(os.add_dll_directory(str(directory)))
                except OSError:
                    pass
            if directories:
                os.environ["PATH"] = os.pathsep.join([*(str(directory) for directory in directories), os.environ.get("PATH", "")])
        from llama_cpp import llama_supports_gpu_offload
        return bool(llama_supports_gpu_offload())
    except (ImportError, AttributeError, OSError, RuntimeError):
        return False


def _model_paths():
    base = Path(__file__).resolve().parents[2]
    configured = {
        "llm": os.environ.get("BSZ_LLM_MODEL"),
        "embedding": os.environ.get("BSZ_EMBED_MODEL"),
    }
    names = {
        "llm": "Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf",
        "embedding": "nomic-embed-text-v1.5.f16.gguf",
    }
    paths = {}
    for kind in names:
        candidates = [Path(configured[kind])] if configured[kind] else []
        candidates.extend([
            base / "models" / names[kind],
            base / names[kind],
            base.parent / "models" / names[kind],
            base.parent / names[kind],
            Path(sys.executable).resolve().parent / "models" / names[kind],
            Path(sys.executable).resolve().parent / names[kind],
            Path.cwd() / "models" / names[kind],
            Path.cwd() / names[kind],
        ])
        paths[kind] = next((p.resolve() for p in candidates if p and p.is_file()), None)
    return paths


class _Runtime:
    def __init__(self):
        self.lock = threading.Lock()
        self.llm = None
        self.embedder = None
        self.error = None
        self.loaded = False
        self.paths = _model_paths()
        self.gpu = _gpu_info()
        self.gpu["backend_available"] = _llama_gpu_available()
        detected_context = 8192 if self.gpu["free_mb"] >= 5000 else 4096 if self.gpu["free_mb"] >= 2500 else 2048
        if self.gpu["available"] and self.gpu["backend_available"]:
            # Model is ~1.9 GB (29 layers). Any GPU with >= 2 GB free or >= 3.5 GB total can offload all layers.
            if self.gpu["free_mb"] >= 2000 or self.gpu["total_mb"] >= 3500:
                detected_layers = -1
            elif self.gpu["free_mb"] >= 1200:
                detected_layers = 18
            else:
                detected_layers = 0
        else:
            detected_layers = 0

        gpu_override = os.environ.get("BSZ_AI_GPU_LAYERS")
        chosen_layers = int(gpu_override) if gpu_override is not None else detected_layers
        self.config = {
            "context_tokens": int(os.environ.get("BSZ_AI_CONTEXT", str(detected_context))),
            "max_tokens": int(os.environ.get("BSZ_AI_MAX_TOKENS", "384")),
            "gpu_layers": chosen_layers,
            "batch": int(os.environ.get("BSZ_AI_BATCH", "512" if chosen_layers != 0 else "256")),
        }
        self.config["backend"] = "cuda" if self.config["gpu_layers"] != 0 else "cpu"
        gpu_requested = self.config["gpu_layers"] != 0 or (gpu_override is None and self.gpu["available"])
        if gpu_requested and not self.gpu["backend_available"]:
            self.error = "GPU inference was requested, but the installed llama.cpp runtime has no GPU offload support."

    def load(self):
        with self.lock:
            if self.loaded:
                return
            if self.error:
                self.loaded = True
                return
            missing = [k for k, p in self.paths.items() if not p]
            if missing:
                self.error = "Missing model file(s): " + ", ".join(missing) + \
                    ". Set BSZ_LLM_MODEL and BSZ_EMBED_MODEL to local GGUF paths."
                self.loaded = True
                return
            try:
                from llama_cpp import Llama
                # Embedder runs fast on CPU (~5-10ms per text) and leaves 100% of VRAM to the generative LLM
                self.embedder = Llama(model_path=str(self.paths["embedding"]), embedding=True,
                                      n_ctx=512, n_batch=256,
                                      n_gpu_layers=0, n_threads=min(4, os.cpu_count() or 4), verbose=False)
                # LLM uses GPU offload for accelerated generation
                self.llm = Llama(model_path=str(self.paths["llm"]), n_ctx=self.config["context_tokens"],
                                 n_batch=self.config["batch"], n_gpu_layers=self.config["gpu_layers"],
                                 n_threads=min(8, os.cpu_count() or 4), verbose=False)
            except (ImportError, OSError, RuntimeError, ValueError) as exc:
                if self.config["gpu_layers"] != 0:
                    try:
                        print(f"BSZ-OS: GPU offload failed ({exc}); attempting partial layer offload (16 layers)...", flush=True)
                        self.llm = Llama(model_path=str(self.paths["llm"]), n_ctx=2048,
                                         n_batch=256, n_gpu_layers=16,
                                         n_threads=min(8, os.cpu_count() or 4), verbose=False)
                        self.config["gpu_layers"] = 16
                        self.config["backend"] = "cuda"
                    except Exception:
                        self.error = f"Local model loading failed ({self.config['backend']}): {type(exc).__name__}: {exc}"
                        self.embedder = self.llm = None
                else:
                    self.error = f"Local model loading failed ({self.config['backend']}): {type(exc).__name__}: {exc}"
                    self.embedder = self.llm = None
            self.loaded = True

    def embedding(self, text):
        self.load()
        if not self.embedder:
            raise RuntimeError(self.error or "Embedding model is unavailable")
        result = self.embedder.create_embedding(text)
        vector = _vector(result.get("data", [{}])[0].get("embedding") if isinstance(result, dict) else result)
        if not vector:
            raise RuntimeError("Embedding model returned an invalid vector")
        return vector

    def reply(self, messages):
        self.load()
        if not self.llm:
            raise RuntimeError(self.error or "Language model is unavailable")
        prepared, max_tokens = self._fit_messages(messages)
        result = self.llm.create_chat_completion(messages=prepared, max_tokens=max_tokens,
                                                  temperature=0.65, top_p=0.9)
        choices = result.get("choices") or []
        text = choices[0].get("message", {}).get("content", "").strip() if choices else ""
        if not text:
            raise RuntimeError("Language model returned an empty response")
        return text

    def stream_reply(self, messages, emit):
        self.load()
        if not self.llm:
            raise RuntimeError(self.error or "Language model is unavailable")
        prepared, max_tokens = self._fit_messages(messages)
        result = self.llm.create_chat_completion(messages=prepared, max_tokens=max_tokens,
                                                  temperature=0.65, top_p=0.9, stream=True)
        full = []
        for chunk in result:
            text = ((chunk.get("choices") or [{}])[0].get("delta") or {}).get("content", "")
            if text:
                full.append(text)
                emit(text)
        answer = "".join(full).strip()
        if not answer:
            raise RuntimeError("Language model returned an empty response")
        return answer

    def _fit_messages(self, messages):
        """Keep prompt plus reserved output inside the model context window."""
        limit = self.config["context_tokens"]
        prepared = list(messages)
        try:
            def token_count(items):
                return sum(len(self.llm.tokenize(str(item.get("content", "")).encode(), add_bos=False))
                           + 4 for item in items)

            while len(prepared) > 2 and token_count(prepared) + 32 >= limit:
                prepared.pop(1)
            if token_count(prepared) + 32 >= limit:
                system = prepared[0]
                content = str(system.get("content", ""))
                tokens = self.llm.tokenize(content.encode(), add_bos=False)
                keep = max(128, limit - token_count(prepared[1:]) - 64)
                system["content"] = self.llm.detokenize(tokens[:keep]).decode(errors="replace")
            available = max(32, limit - token_count(prepared) - 16)
            return prepared, min(self.config["max_tokens"], available)
        except (AttributeError, TypeError, ValueError, UnicodeError):
            return prepared[-4:], min(self.config["max_tokens"], max(32, limit // 4))


def register(core):
    core.sql("""create table if not exists ai_documents(
        id integer primary key, uid integer not null, source_type text not null,
        source_id text not null, content text not null, timestamp real not null,
        metadata_json text not null, content_hash text not null,
        unique(uid, source_type, source_id, content_hash))""")
    core.sql("""create table if not exists ai_embeddings(
        document_id integer primary key, uid integer not null, embedding blob not null,
        model_id text not null, dimensions integer not null, created_at real not null)""")
    core.sql("""create table if not exists ai_conversations(
        id text primary key, uid integer not null, title text not null,
        created_at real not null, updated_at real not null, archived integer not null default 0,
        deleted integer not null default 0)""")
    try:
        core.sql("alter table ai_conversations add column deleted integer not null default 0")
    except Exception:
        pass
    core.sql("""create table if not exists ai_messages(
        id integer primary key, conversation_id text not null, uid integer not null,
        role text not null, content text not null, timestamp real not null,
        metadata_json text not null)""")
    core.sql("create index if not exists ai_doc_uid_time on ai_documents(uid, timestamp)")
    core.sql("create index if not exists ai_msg_uid_time on ai_messages(uid, timestamp)")
    runtime = _Runtime()
    jobs = queue.Queue()
    warmup_lock = threading.Lock()
    warmup_state = {"status": "idle", "uid": None, "error": None, "started": None, "finished": None}
    warmup_events = {}

    def health_snapshot(uid):
        req = _Request(uid)
        state = {}
        for name in ("health.vitals", "health.domains", "health.score", "health.recs", "health.immune",
                     "space.radiation", "space.solar", "cabin.atmo"):
            fn = core.feeds.get(name)
            if fn:
                state[name] = fn(req)
        return state

    def _health_documents(uid):
        rows = core.rows("select rowid, metric, value, ts, kind, source from readings "
                         "where uid in (?, 0) order by ts desc limit 500", (uid,))
        docs = []
        for rowid, metric, value, ts, kind, source in rows:
            content = f"{metric}: {value} at {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(ts))} "
            content += f"({kind}, source {source or 'unknown'})."
            docs.append((f"reading:{rowid}", content, ts, {"metric": metric, "kind": kind, "source": source}))
        return docs

    def _upsert_document(uid, source_type, source_id, content, timestamp, metadata):
        digest = hashlib.sha256(content.encode()).hexdigest()
        old = core.rows("select id, content_hash from ai_documents where uid=? and source_type=? and source_id=? "
                        "order by id desc limit 1", (uid, source_type, source_id))
        if old and old[0][1] == digest:
            return old[0][0]
        if old:
            core.sql("delete from ai_embeddings where document_id=?", (old[0][0],))
            core.sql("delete from ai_documents where id=?", (old[0][0],))
        c = core.sql("insert into ai_documents(uid,source_type,source_id,content,timestamp,metadata_json,content_hash) "
                     "values(?,?,?,?,?,?,?)", (uid, source_type, source_id, content, timestamp, _json(metadata), digest))
        return c.lastrowid

    def index_health(uid):
        for source_id, content, ts, metadata in _health_documents(uid):
            doc_id = _upsert_document(uid, "health", source_id, content, ts, metadata)
            if not core.rows("select 1 from ai_embeddings where document_id=?", (doc_id,)):
                embedding = runtime.embedding(content)
                core.sql("insert or replace into ai_embeddings values(?,?,?,?,?,?)",
                         (doc_id, uid, json.dumps(embedding).encode(), "nomic-embed-text-v1.5", len(embedding), time.time()))

    def warmup(uid):
        with warmup_lock:
            if warmup_state["status"] == "running" and warmup_state["uid"] == uid:
                return
            event = warmup_events.setdefault(uid, threading.Event())
            event.clear()
            warmup_state.update(status="running", uid=uid, error=None, started=time.time(), finished=None)
        try:
            runtime.load()
            index_health(uid)
            with warmup_lock:
                warmup_state.update(status="ready", finished=time.time())
        except Exception as exc:
            with warmup_lock:
                warmup_state.update(status="error", error=f"{type(exc).__name__}: {exc}", finished=time.time())
        finally:
            warmup_events[uid].set()

    def wait_for_warmup(uid):
        with warmup_lock:
            event = warmup_events.get(uid)
            status = warmup_state["status"] if warmup_state["uid"] == uid else "idle"
        if status == "idle":
            runtime.load()
        elif event:
            event.wait()

    def index_message(uid, conversation_id, role, content, ts):
        digest = hashlib.sha256(content.encode()).hexdigest()
        doc_id = _upsert_document(uid, "chat", str(conversation_id) + ":" + role + ":" + digest,
                                  content, ts, {"conversation_id": conversation_id, "role": role, "source": "chat"})
        if not core.rows("select 1 from ai_embeddings where document_id=?", (doc_id,)):
            embedding = runtime.embedding(content)
            core.sql("insert or replace into ai_embeddings values(?,?,?,?,?,?)",
                     (doc_id, uid, json.dumps(embedding).encode(), "nomic-embed-text-v1.5", len(embedding), time.time()))

    def retrieve(uid, query, conversation_id):
        query_vector = runtime.embedding(query)
        rows = core.rows("select d.id,d.content,d.timestamp,d.metadata_json,e.embedding from ai_documents d "
                         "join ai_embeddings e on e.document_id=d.id where d.uid=? order by d.timestamp desc limit 1000", (uid,))
        now = time.time()
        scored = []
        for doc_id, content, ts, metadata_json, blob in rows:
            try:
                vector = _vector(json.loads(bytes(blob).decode()))
                metadata = json.loads(metadata_json)
            except (ValueError, TypeError, json.JSONDecodeError, UnicodeDecodeError):
                continue
            score = _cosine(query_vector, vector) + min(0.15, max(0, 1 - (now - ts) / (30 * 86400)) * 0.15)
            if metadata.get("conversation_id") == conversation_id:
                score += 0.1
            scored.append((score, doc_id, content, ts, metadata))
        scored.sort(reverse=True)
        return [{"content": x[2], "timestamp": x[3], "metadata": x[4], "score": round(x[0], 3)}
                for x in scored[:8]]

    def build_health_context(uid, conversation_id, user_message):
        state = health_snapshot(uid)
        baselines = core.rows("select metric,value from health_base where uid=? order by metric", (uid,))
        history = retrieve(uid, user_message, conversation_id)
        alerts = []
        for domain in state.get("health.domains", []):
            if domain.get("status") in ("alert", "watch"):
                alerts.append({"id": domain["id"], "status": domain["status"], "label": domain["label"],
                               "reasons": domain.get("reasons", [])[:3]})
        return {
            "PERSONAL PROFILE": {"uid": uid},
            "CURRENT HEALTH STATE": state,
            "PERSONAL BASELINES": [{"metric": m, "value": v} for m, v in baselines],
            "HISTORICAL TRENDS": history,
            "RELEVANT PREVIOUS CONVERSATIONS": [x for x in history if x["metadata"].get("source") == "chat"],
            "ACTIVE ALERTS": alerts,
            "DATA QUALITY": {"simulated": any(x.get("metadata", {}).get("source") == "sim" for x in history),
                             "retrieved_documents": len(history), "note": "Unknown or stale values remain unknown."},
        }

    def conversation(uid, conversation_id):
        if conversation_id:
            found = core.rows("select id from ai_conversations where id=? and uid=?", (conversation_id, uid))
            if found:
                return conversation_id
            return None
        cid = uuid.uuid4().hex
        now = time.time()
        core.sql("insert into ai_conversations(id,uid,title,created_at,updated_at,archived,deleted) "
                 "values(?,?,?,?,?,?,?)", (cid, uid, "New health chat", now, now, 0, 0))
        return cid

    def fallback_title(text):
        words = " ".join(text.replace("\n", " ").split()).strip(" .?!")
        return (words[:48].rsplit(" ", 1)[0] or words or "New health chat").strip()

    def title_for(messages):
        prompt = next((message["content"] for message in messages if message["role"] == "user"), "")
        return fallback_title(prompt)

    def run(job):
        try:
            uid, cid, messages, done, stream = job
            user_message = messages[-1]["content"]
            wait_for_warmup(uid)
            for message in messages[:-1]:
                index_message(uid, cid, message["role"], message["content"], time.time())
            context = build_health_context(uid, cid, user_message)
            prompt = _json(context)
            input_messages = [{"role": "system", "content": SYSTEM_PROMPT + "\n\nPERSONAL HEALTH CONTEXT:\n" + prompt}]
            input_messages.extend(messages[-12:])
            if stream:
                reply = runtime.stream_reply(input_messages, lambda text: done.put(
                    _json({"type": "token", "text": text}) + "\n"))
            else:
                reply = runtime.reply(input_messages)
            now = time.time()
            index_message(uid, cid, "user", user_message, now)
            core.sql("insert into ai_messages(conversation_id,uid,role,content,timestamp,metadata_json) values(?,?,?,?,?,?)",
                     (cid, uid, "assistant", reply, now, _json({"context_documents": len(context["HISTORICAL TRENDS"])})))
            index_message(uid, cid, "assistant", reply, now)
            existing_title = core.rows("select title from ai_conversations where id=? and uid=?", (cid, uid))[0][0]
            title = title_for(messages) if existing_title == "New health chat" else existing_title
            core.sql("update ai_conversations set title=?, updated_at=? where id=? and uid=?",
                     (title, now, cid, uid))
            if stream:
                done.put(_json({"type": "done", "reply": reply, "conversation_id": cid}) + "\n")
            else:
                done.put((reply, cid, None))
        except Exception as exc:
            if stream:
                done.put(_json({"type": "error", "error": f"{type(exc).__name__}: {exc}"}) + "\n")
            else:
                done.put((None, None, f"{type(exc).__name__}: {exc}"))

    def worker():
        while True:
            run(jobs.get())

    threading.Thread(target=worker, daemon=True, name="bsz-ai-worker").start()

    def chat(req):
        body = req.body if isinstance(req.body, dict) else {}
        raw = body.get("messages")
        if not isinstance(raw, list) or not raw:
            return 400, {"error": "messages must be a non-empty list"}
        messages = [{"role": x.get("role"), "content": str(x.get("content", "")).strip()}
                    for x in raw[-12:] if isinstance(x, dict) and x.get("role") in ("user", "assistant")]
        if not messages or messages[-1]["role"] != "user" or not messages[-1]["content"]:
            return 400, {"error": "The last message must be a non-empty user message"}
        if len(messages[-1]["content"]) > 2000:
            return 400, {"error": "Message is too long"}
        cid = conversation(req.uid, body.get("conversation_id"))
        if cid is None:
            return 404, {"error": "Conversation not found"}
        now = time.time()
        core.sql("insert into ai_messages(conversation_id,uid,role,content,timestamp,metadata_json) values(?,?,?,?,?,?)",
                 (cid, req.uid, "user", messages[-1]["content"], now, _json({})))
        done = queue.Queue()
        jobs.put((req.uid, cid, messages, done, False))
        reply, result_cid, error = done.get()
        if error:
            return 503, {"error": "Personalized local AI is unavailable", "detail": error, "conversation_id": cid}
        return {"reply": reply, "conversation_id": result_cid}

    def chat_stream(req):
        body = req.body if isinstance(req.body, dict) else {}
        raw = body.get("messages")
        if not isinstance(raw, list) or not raw:
            return 400, {"error": "messages must be a non-empty list"}
        messages = [{"role": x.get("role"), "content": str(x.get("content", "")).strip()}
                    for x in raw[-12:] if isinstance(x, dict) and x.get("role") in ("user", "assistant")]
        if not messages or messages[-1]["role"] != "user" or not messages[-1]["content"]:
            return 400, {"error": "The last message must be a non-empty user message"}
        cid = conversation(req.uid, body.get("conversation_id"))
        if cid is None:
            return 404, {"error": "Conversation not found"}
        now = time.time()
        core.sql("insert into ai_messages(conversation_id,uid,role,content,timestamp,metadata_json) values(?,?,?,?,?,?)",
                 (cid, req.uid, "user", messages[-1]["content"], now, _json({})))
        done = queue.Queue()
        jobs.put((req.uid, cid, messages, done, True))

        def chunks():
            while True:
                item = done.get()
                yield item
                if '"type":"done"' in item or '"type":"error"' in item:
                    return

        return _Stream(chunks())

    def warmup_route(req):
        with warmup_lock:
            if warmup_state["status"] != "running" or warmup_state["uid"] != req.uid:
                warmup_state.update(status="starting", uid=req.uid, error=None, started=time.time(), finished=None)
                threading.Thread(target=warmup, args=(req.uid,), daemon=True, name="bsz-ai-warmup").start()
            return dict(warmup_state)

    def status(req):
        runtime.load()
        with warmup_lock:
            warmup = dict(warmup_state)
        return {"ready": bool(runtime.llm and runtime.embedder), "models": {k: str(v) if v else None
                for k, v in runtime.paths.items()}, "error": runtime.error, "config": runtime.config,
                "gpu": runtime.gpu, "warmup": warmup}

    def conversations(req):
        search = req.query.get("search", "").strip()
        category = req.query.get("category", "current")
        clauses, args = ["uid=?"], [req.uid]
        if category == "archived":
            clauses.append("archived=1 AND deleted=0")
        elif category == "deleted":
            clauses.append("deleted=1")
        elif category in ("active", "inactive"):
            operator = ">" if category == "active" else "<="
            clauses.append("archived=0 AND deleted=0 AND updated_at<?")
            clauses[-1] = f"archived=0 AND deleted=0 AND updated_at{operator}?"
            args.append(time.time() - INACTIVE_AFTER)
        else:
            clauses.append("archived=0 AND deleted=0")
        if search:
            clauses.append("title LIKE ?")
            args.append("%" + search + "%")
        return [{"id": x[0], "title": x[1], "created_at": x[2], "updated_at": x[3],
                 "archived": bool(x[4]), "deleted": bool(x[5])}
                for x in core.rows("select id,title,created_at,updated_at,archived,deleted "
                                   "from ai_conversations where " + " and ".join(clauses) +
                                   " order by updated_at desc", args)]

    def messages(req):
        cid = req.query.get("conversation_id", "")
        if not core.rows("select 1 from ai_conversations where id=? and uid=?", (cid, req.uid)):
            return 404, {"error": "Conversation not found"}
        return [{"role": x[0], "content": x[1], "timestamp": x[2]}
                for x in core.rows("select role,content,timestamp from ai_messages "
                                   "where conversation_id=? and uid=? order by timestamp", (cid, req.uid))]

    def update_conversation(req):
        cid = req.body.get("conversation_id") if isinstance(req.body, dict) else None
        action = req.body.get("action") if isinstance(req.body, dict) else None
        if action not in ("archive", "restore", "delete", "undelete"):
            return 400, {"error": "Unsupported conversation action"}
        if not core.rows("select 1 from ai_conversations where id=? and uid=?", (cid, req.uid)):
            return 404, {"error": "Conversation not found"}
        if action == "delete":
            document_ids = core.rows("select id from ai_documents where uid=? and "
                                     "json_extract(metadata_json, '$.conversation_id')=?", (req.uid, cid))
            for (document_id,) in document_ids:
                core.sql("delete from ai_embeddings where document_id=?", (document_id,))
                core.sql("delete from ai_documents where id=?", (document_id,))
            core.sql("delete from ai_messages where conversation_id=? and uid=?", (cid, req.uid))
            core.sql("delete from ai_conversations where id=? and uid=?", (cid, req.uid))
            return {"ok": True}
        archived = int(action == "archive")
        deleted = int(action == "delete")
        if action == "restore":
            archived = deleted = 0
        elif action == "undelete":
            deleted = 0
        core.sql("update ai_conversations set archived=?, deleted=? where id=? and uid=?",
                 (archived, deleted, cid, req.uid))
        return {"ok": True}

    core.route("POST", "/api/ai/chat", chat)
    core.route("POST", "/api/ai/chat/stream", chat_stream)
    core.route("POST", "/api/ai/warmup", warmup_route)
    core.route("GET", "/api/ai/status", status)
    core.route("GET", "/api/ai/conversations", conversations)
    core.route("GET", "/api/ai/messages", messages)
    core.route("POST", "/api/ai/conversation", update_conversation)

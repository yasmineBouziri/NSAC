"""BSZ-OS core. Loads every engine in ./engines and serves them on localhost.
Engine contract: engines/<name>/engine.py with MANIFEST (dict) and register(core)."""
import http.server, json, os, sqlite3, subprocess, sys, threading, time, traceback, webbrowser, importlib.util, mimetypes
import hashlib, hmac, math, random, re, secrets, statistics, collections  # noqa: imported here so PyInstaller bundles them for engines
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.parse import urlparse, parse_qs

FROZEN = getattr(sys, "frozen", False)
BASE = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
HOME = Path(sys.executable).parent if FROZEN else BASE
HOST = os.environ.get("BSZ_HOST", "127.0.0.1")
PORT = int(os.environ.get("BSZ_PORT", "8787"))
MIME = {".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".html": "text/html; charset=utf-8",
        ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2"}


def reexec_local_runtime():
    if FROZEN or os.environ.get("BSZ_RUNTIME_BOOTSTRAPPED") or not (BASE / "runtime_bootstrap.py").is_file():
        return
    try:
        import llama_cpp  # noqa: F401
    except ImportError:
        os.environ["BSZ_RUNTIME_BOOTSTRAPPED"] = "1"
        os.execvpe(
            sys.executable,
            [sys.executable, str(BASE / "runtime_bootstrap.py"), *sys.argv[1:]],
            os.environ,
        )


reexec_local_runtime()


class Req:
    def __init__(s, body, query, token, uid):
        s.body, s.query, s.token, s.uid = body, query, token, uid


class Core:
    def __init__(s):
        s.data_dir = HOME / "data"
        s.data_dir.mkdir(exist_ok=True)
        s.db = sqlite3.connect(s.data_dir / "bsz.db", check_same_thread=False)
        s.lock = threading.Lock()
        s.routes, s.feeds, s.engines, s.static, s.auth = {}, {}, [], None, None
        s.subs, s.active = {}, {}

    def sql(s, q, a=()):
        with s.lock:
            c = s.db.execute(q, a)
            s.db.commit()
            return c

    def rows(s, q, a=()):
        with s.lock:
            return s.db.execute(q, a).fetchall()

    def route(s, method, path, fn, public=False):
        s.routes[(method, path)] = (fn, public)

    def feed(s, name, fn):
        s.feeds[name] = fn

    def on(s, topic, fn):
        s.subs.setdefault(topic, []).append(fn)

    def emit(s, topic, payload):
        for fn in s.subs.get(topic, []):
            try:
                fn(payload)
            except Exception:
                traceback.print_exc()

    def touch(s, uid):
        s.active[uid] = time.time()


def load_engines(core):
    core.route("GET", "/api/engines", lambda r: core.engines, public=True)
    for p in sorted((BASE / "engines").iterdir()):
        f = p / "engine.py"
        if not f.exists():
            continue
        info = {"name": p.name, "status": "ok", "provides": []}
        try:
            spec = importlib.util.spec_from_file_location("engine_" + p.name, f)
            m = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(m)
            info.update(m.MANIFEST)
            m.register(core)
        except Exception as e:
            info.update(status="failed", error=f"{type(e).__name__}: {e}")
            traceback.print_exc()
        core.engines.append(info)


def make_handler(core):
    class H(http.server.BaseHTTPRequestHandler):
        server_version = "BSZ-OS"
        protocol_version = "HTTP/1.1"

        def log_message(s, *a):
            pass

        def send(s, code, body, ctype="application/json", headers=()):
            b = body if isinstance(body, bytes) else json.dumps(body).encode()
            s.send_response(code)
            for k, v in (("Content-Type", ctype), ("Content-Length", str(len(b))), ("Cache-Control", "no-store"),
                         ("X-Content-Type-Options", "nosniff"), ("X-Frame-Options", "DENY")) + tuple(headers):
                s.send_header(k, v)
            s.end_headers()
            s.wfile.write(b)

        def stream(s, response):
            s.send_response(response.status)
            for k, v in (("Content-Type", "application/x-ndjson; charset=utf-8"),
                         ("Cache-Control", "no-store"), ("Transfer-Encoding", "chunked"),
                         ("X-Content-Type-Options", "nosniff"), ("X-Frame-Options", "DENY")):
                s.send_header(k, v)
            s.end_headers()
            try:
                for item in response:
                    b = item if isinstance(item, bytes) else item.encode()
                    s.wfile.write(f"{len(b):X}\r\n".encode() + b + b"\r\n")
                    s.wfile.flush()
            finally:
                s.wfile.write(b"0\r\n\r\n")
                s.wfile.flush()

        def token(s):
            c = SimpleCookie(s.headers.get("Cookie", ""))
            return c["bsz"].value if "bsz" in c else None

        def api(s, method):
            u = urlparse(s.path)
            n = int(s.headers.get("Content-Length") or 0)
            if n > 524288:
                return s.send(413, {"error": "Payload too large"})
            try:
                body = json.loads(s.rfile.read(n) or b"{}") if n else {}
            except ValueError:
                return s.send(400, {"error": "Bad JSON"})
            q = {k: v[0] for k, v in parse_qs(u.query).items()}
            tok = s.token()
            uid = core.auth(tok) if core.auth and tok else None
            req = Req(body, q, tok, uid)
            if u.path.startswith("/api/feed/") and method == "GET":
                fn, public = core.feeds.get(u.path[10:]), False
                if not fn:
                    return s.send(404, {"error": "No such feed"})
            else:
                fn, public = core.routes.get((method, u.path), (None, False))
                if not fn:
                    return s.send(404, {"error": "No such route"})
            if not public and not uid:
                return s.send(401, {"error": "Not signed in"})
            try:
                r = fn(req)
            except Exception as e:
                traceback.print_exc()
                return s.send(500, {"error": f"{type(e).__name__}: {e}"})
            if hasattr(r, "status") and hasattr(r, "__iter__"):
                return s.stream(r)
            if isinstance(r, tuple):
                s.send(r[0], r[1], headers=r[2] if len(r) > 2 else ())
            else:
                s.send(200, r)

        def do_GET(s):
            if s.path.startswith("/api/"):
                return s.api("GET")
            root = core.static
            if not root:
                return s.send(503, {"error": "No display engine"})
            rel = urlparse(s.path).path.lstrip("/") or "index.html"
            f = (root / rel).resolve()
            if root not in f.parents or not f.is_file():
                return s.send(404, {"error": "Not found"})
            s.send(200, f.read_bytes(), MIME.get(f.suffix) or mimetypes.guess_type(f.name)[0] or "application/octet-stream")

        def do_POST(s):
            s.api("POST")

        def do_PUT(s):
            s.api("PUT")

    return H


def open_window(url):
    if os.name == "nt":
        try:
            subprocess.Popen(["cmd", "/c", "start", "", "msedge", f"--app={url}"], creationflags=0x08000000)
            return
        except OSError:
            pass
    webbrowser.open(url)


def main():
    core = Core()
    load_engines(core)
    if core.static:
        core.static = core.static.resolve()
    url = f"http://{HOST}:{PORT}"
    try:
        srv = http.server.ThreadingHTTPServer((HOST, PORT), make_handler(core))
    except OSError:
        print("BSZ-OS already running, opening window")
        return open_window(url)
    srv.daemon_threads = True
    for e in core.engines:
        print(f"[{'OK' if e['status'] == 'ok' else 'FAIL'}] {e['name']} {e.get('version', '')} {e.get('error', '')}")
    print(f"BSZ-OS running at {url}  (Ctrl+C to stop)")
    if "--no-window" not in sys.argv:
        threading.Timer(0.6, open_window, (url,)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

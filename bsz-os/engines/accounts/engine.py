"""Accounts engine: local users, sessions, per-account state storage."""
import hashlib, hmac, json, re, secrets, sqlite3, time

MANIFEST = {"name": "accounts", "version": "0.1.0", "provides": ["auth", "state"]}
SESSION_DAYS = 30
fails = {}


def _hash(pw, salt):
    return hashlib.scrypt(pw.encode(), salt=salt, n=2 ** 14, r=8, p=1)


def register(core):
    core.sql("create table if not exists users(id integer primary key, name text unique collate nocase, salt blob, hash blob, created real)")
    core.sql("create table if not exists sessions(token text primary key, uid integer, created real)")
    core.sql("create table if not exists state(uid integer primary key, json text)")

    def auth(token):
        r = core.rows("select uid from sessions where token=? and created>?", (token, time.time() - SESSION_DAYS * 86400))
        return r[0][0] if r else None

    core.auth = auth

    def session(uid, status=200):
        t = secrets.token_urlsafe(32)
        core.sql("insert into sessions values(?,?,?)", (t, uid, time.time()))
        name = core.rows("select name from users where id=?", (uid,))[0][0]
        ck = f"bsz={t}; HttpOnly; SameSite=Strict; Path=/; Max-Age={SESSION_DAYS * 86400}"
        return status, {"id": uid, "name": name}, [("Set-Cookie", ck)]

    def reg(req):
        n, p = str(req.body.get("name", "")).strip(), str(req.body.get("password", ""))
        if not re.fullmatch(r"[A-Za-z0-9_-]{3,24}", n):
            return 400, {"error": "Name: 3 to 24 letters, digits, - or _"}
        if len(p) < 8:
            return 400, {"error": "Password needs at least 8 characters"}
        salt = secrets.token_bytes(16)
        try:
            c = core.sql("insert into users(name,salt,hash,created) values(?,?,?,?)", (n, salt, _hash(p, salt), time.time()))
        except sqlite3.IntegrityError:
            return 409, {"error": "That name is taken"}
        return session(c.lastrowid, 201)

    def login(req):
        n, p = str(req.body.get("name", "")).strip().lower(), str(req.body.get("password", ""))
        cnt, until = fails.get(n, (0, 0))
        if until > time.time():
            return 429, {"error": f"Too many attempts. Wait {int(until - time.time())}s"}
        r = core.rows("select id,salt,hash from users where name=?", (n,))
        if not r or not hmac.compare_digest(_hash(p, r[0][1]), r[0][2]):
            fails[n] = (cnt + 1, time.time() + 30 if cnt + 1 >= 5 else 0)
            return 401, {"error": "Wrong name or password"}
        fails.pop(n, None)
        return session(r[0][0])

    def logout(req):
        core.sql("delete from sessions where token=?", (req.token,))
        return 200, {"ok": True}, [("Set-Cookie", "bsz=; Max-Age=0; Path=/")]

    def me(req):
        return {"id": req.uid, "name": core.rows("select name from users where id=?", (req.uid,))[0][0]}

    def get_state(req):
        r = core.rows("select json from state where uid=?", (req.uid,))
        return json.loads(r[0][0]) if r else {}

    def put_state(req):
        if not isinstance(req.body, dict):
            return 400, {"error": "Bad state"}
        core.sql("insert into state values(?,?) on conflict(uid) do update set json=excluded.json", (req.uid, json.dumps(req.body)))
        return {"ok": True}

    core.route("POST", "/api/auth/register", reg, public=True)
    core.route("POST", "/api/auth/login", login, public=True)
    core.route("POST", "/api/auth/logout", logout, public=True)
    core.route("GET", "/api/auth/me", me)
    core.route("GET", "/api/state", get_state)
    core.route("PUT", "/api/state", put_state)

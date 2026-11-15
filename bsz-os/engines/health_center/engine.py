"""Per-crew state for the Health Center applet."""
import json
import time


MANIFEST = {
    "name": "health_center",
    "version": "0.1.0",
    "provides": ["GET /api/health-center/state", "PUT /api/health-center/state"],
}


def register(core):
    core.sql("""create table if not exists health_center_state(
        uid integer primary key, state_json text not null, updated_at real not null)""")

    def get_state(req):
        rows = core.rows("select state_json from health_center_state where uid=?", (req.uid,))
        return {"state": json.loads(rows[0][0]) if rows else {}}

    def put_state(req):
        state = req.body.get("state") if isinstance(req.body, dict) else None
        if not isinstance(state, dict):
            return 400, {"error": "state must be an object"}
        try:
            serialized = json.dumps(state, separators=(",", ":"), ensure_ascii=True, allow_nan=False)
        except (TypeError, ValueError) as exc:
            return 400, {"error": f"state is not valid JSON: {exc}"}
        if len(serialized.encode("utf-8")) > 500_000:
            return 413, {"error": "Health Center state is too large"}
        core.sql(
            "insert into health_center_state(uid,state_json,updated_at) values(?,?,?) "
            "on conflict(uid) do update set state_json=excluded.state_json, updated_at=excluded.updated_at",
            (req.uid, serialized, time.time()),
        )
        return {"ok": True}

    core.route("GET", "/api/health-center/state", get_state)
    core.route("PUT", "/api/health-center/state", put_state)

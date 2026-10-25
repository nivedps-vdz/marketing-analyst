"""Development smoke check against a running backend. Prints a compact summary of key endpoints."""

import json
import sys
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return json.loads(r.read())


meta = get("/api/meta")
p = meta["default_period"]
q = f"start={p['start']}&end={p['end']}"
print("meta", meta["data_source"], meta["data_from"], meta["data_through"], p)
s = get(f"/api/overview/summary?{q}")["metrics"]
print("overview", {k: (round(v["value"], 2) if isinstance(v["value"], float) else v["value"], v["change_pct"] and round(v["change_pct"], 1)) for k, v in s.items()})
for c in get(f"/api/overview/clients?{q}")["clients"]:
    print("client", c["id"], c["name"], c["connection_status"], c["metrics"]["spend"]["value"], c["metrics"]["spend"]["unavailable_reason"], len(c["sparkline"]))
cid = 1
print("formats", [(r["format"], r["ad_count"], round(r["spend_share"] or 0, 2)) for r in get(f"/api/clients/{cid}/formats?{q}")["rows"]])
rk = get(f"/api/clients/{cid}/rankings?{q}")
print("rankings", [(r["key"], r["eligible"], [e["name"] for e in r["entries"][:2]]) for r in rk["rankings"]], "needs", len(rk["needs_more_data"]["entries"]))
for cid in (1, 2, 3, 4, 5):
    ins = get(f"/api/clients/{cid}/insights?{q}")["insights"]
    print("insights", cid, [(i["kind"], i["title"]) for i in ins])

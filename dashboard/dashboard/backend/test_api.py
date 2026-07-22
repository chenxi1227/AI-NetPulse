import os, json, urllib.request

os.environ["NO_PROXY"] = "127.0.0.1,localhost"
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

def req(method, url, data=None, headers=None):
    h = dict(headers or {})
    body = None
    if data:
        h.setdefault("Content-Type", "application/json")
        body = json.dumps(data).encode()
    r = opener.open(urllib.request.Request(url, data=body, headers=h, method=method), timeout=5)
    return r.status, json.loads(r.read())

base = "http://localhost:8000"

# Login
status, data = req("POST", f"{base}/api/auth/login", {"username": "admin", "password": "admin"})
print(f"Login: {status}")
token = data["access_token"]
print(f"  token: {data['access_token'][:30]}...")

# Logs
status, data = req("GET", f"{base}/api/logs?page=1&size=20", None, {"Authorization": f"Bearer {token}"})
print(f"Logs: {status} total={data['total']} first={data['records'][0]['user_message']}")

# Filter blocked
status, data = req("GET", f"{base}/api/logs?status=BLOCKED", None, {"Authorization": f"Bearer {token}"})
print(f"Filtered(BLOCKED): {status} total={data['total']}")

# Detail #2
status, data = req("GET", f"{base}/api/logs/2", None, {"Authorization": f"Bearer {token}"})
print(f"Detail #2: {status} status={data['review_status']} model={data['model_name']}")

# Stats
status, data = req("GET", f"{base}/api/stats/overview", None, {"Authorization": f"Bearer {token}"})
print(f"Stats: total={data['total']} approved={data['approved']} blocked={data['blocked']} today={data['today_total']}")

# Users
status, data = req("GET", f"{base}/api/users", None, {"Authorization": f"Bearer {token}"})
print(f"Users: {status} count={len(data)} admin={data[0]['username']}")

# CSV
r = opener.open(urllib.request.Request(f"{base}/api/logs/export/csv?status=APPROVED", headers={"Authorization": f"Bearer {token}"}), timeout=5)
print(f"CSV: status={r.status} len={len(r.read())}")

print("\n=== ALL BACKEND TESTS PASSED ===")

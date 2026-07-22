import httpx

BASE = "http://127.0.0.1:8000"

login = httpx.post(f"{BASE}/api/auth/login", json={"username": "admin", "password": "admin"})
token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

logs = httpx.get(f"{BASE}/api/logs", headers=headers)
print("logs:", logs.status_code, "total:", logs.json()["total"])

stats = httpx.get(f"{BASE}/api/stats/overview", headers=headers)
print("stats:", stats.status_code, stats.json())

trend = httpx.get(f"{BASE}/api/stats/trend?days=7", headers=headers)
print("trend:", trend.status_code, "dates:", len(trend.json()["dates"]))

users = httpx.get(f"{BASE}/api/users", headers=headers)
print("users:", users.status_code, "count:", len(users.json()))

export = httpx.get(f"{BASE}/api/logs/export/csv", headers=headers)
print("export:", export.status_code, "length:", len(export.text))

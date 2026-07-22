from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from models import init_db
from routers import auth, logs, stats, users, sites, compliance
from utils import verify_token
from config import JWT_SECRET

app = FastAPI(title="AI NetPulse Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PUBLIC_PATHS = {"/api/auth/login", "/api/auth/refresh"}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if path in PUBLIC_PATHS:
        return await call_next(request)
    if path.startswith("/api/"):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "Missing or invalid token"})
        payload = verify_token(auth_header[7:])
        if not payload:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})
    return await call_next(request)


app.include_router(auth.router)
app.include_router(logs.router)
app.include_router(stats.router)
app.include_router(users.router)
app.include_router(sites.router)
app.include_router(compliance.router)


@app.on_event("startup")
def startup():
    init_db()
    print("Dashboard ready on http://localhost:8000")

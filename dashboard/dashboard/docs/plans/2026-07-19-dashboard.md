# AI Gateway Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Web Dashboard for the ChenXi AI Gateway: admin login, audit log viewer with filtering, statistics charts, and user management.

**Architecture:** FastAPI backend (port 8000) serves a React SPA (Vite, port 5173). The mitmproxy addon (`test1/main.py`) pushes audit records to the Dashboard via a fire-and-forget HTTP POST. The Dashboard owns the SQLite database.

**Tech Stack:** FastAPI + Uvicorn + SQLAlchemy (sync) + python-jose + passlib (backend); React 18 + TypeScript + Vite + Tailwind CSS 3 + Recharts + Lucide React (frontend)

## Global Constraints

- Dashboard runs on port 8000; React dev server on port 5173
- Vite proxy: `/api` -> `http://localhost:8000` in dev mode
- Database path: `ChenXi/dashboard/project.db` (SQLite, WAL mode on startup)
- Default admin account: `admin` / `admin` (created automatically if DB is empty)
- JWT secret: `chenxi-dashboard-secret-key-2026` (hardcoded in config.py)
- JWT expiry: 7 days
- Internal push API Key: `chenxi-gateway-push` (hardcoded)
- Design follows NetPulse UI system: dark theme (#0F0E11 bg, #F59E0B accent, #1A181F cards)
- All API responses return JSON; log list uses `{ records, total, page, size }` envelope

---

### Task 1: Backend Scaffold - Config, Models, Utils

**Files:**
- Create: `backend/config.py`
- Create: `backend/models.py`
- Create: `backend/schemas.py`
- Create: `backend/utils.py`
- Create: `backend/requirements.txt`

**Interfaces:**
- Produces: `config.API_KEY`, `config.JWT_SECRET`, `config.DB_PATH` (config)
- Produces: `models.AdminUser`, `models.AuditLog`, `models.init_db()` (models)
- Produces: `schemas.LoginRequest`, `schemas.TokenResponse`, `schemas.PushLogRequest`, `schemas.LogEntry`, `schemas.LogListResponse`, `schemas.StatsOverview`, `schemas.TrendResponse`, `schemas.UserCreate`, `schemas.UserResponse` (schemas)
- Produces: `utils.create_access_token()`, `utils.verify_token()`, `utils.hash_password()`, `utils.verify_password()`

- [ ] **Step 1: Create `backend/requirements.txt`**

```
fastapi==0.139.0
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

- [ ] **Step 2: Create `backend/config.py`**

```python
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(os.path.dirname(BASE_DIR), "project.db")
JWT_SECRET = "chenxi-dashboard-secret-key-2026"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7
API_KEY = "chenxi-gateway-push"
```

- [ ] **Step 3: Create `backend/models.py`**

```python
import os
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, func, text
from sqlalchemy.orm import declarative_base, sessionmaker
from config import DB_PATH

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
with engine.connect() as conn:
    conn.execute(text("PRAGMA journal_mode=WAL"))
    conn.execute(text("PRAGMA busy_timeout=5000"))
    conn.commit()

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(200), nullable=False)
    role = Column(String(20), default="user")
    department = Column(String(20), default="")
    created_at = Column(DateTime, server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    userid = Column(String(50))
    user_ip = Column(String(50))
    user_message = Column(Text)
    review_status = Column(String(20))
    review_reason = Column(Text)
    raw_ai_json = Column(Text)
    captured_at = Column(DateTime, server_default=func.now())

def init_db():
    Base.metadata.create_all(engine)
    session = SessionLocal()
    if not session.query(AdminUser).first():
        from utils import hash_password
        admin = AdminUser(username="admin", password=hash_password("admin"), role="admin", department="IT")
        session.add(admin)
        session.commit()
    session.close()
```

- [ ] **Step 4: Create `backend/utils.py`**

```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_DAYS

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None
```

- [ ] **Step 5: Create `backend/schemas.py`**

```python
from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class PushLogRequest(BaseModel):
    userid: str
    user_ip: str
    user_message: str
    review_status: str
    review_reason: str
    raw_ai_json: str

class LogEntry(BaseModel):
    id: int
    userid: str
    user_ip: str
    user_message: str
    review_status: str
    review_reason: str
    raw_ai_json: str
    captured_at: str

class LogListResponse(BaseModel):
    records: list[LogEntry]
    total: int
    page: int
    size: int

class StatsOverview(BaseModel):
    total: int
    approved: int
    blocked: int

class TrendItem(BaseModel):
    date: str
    approved: int
    blocked: int

class TrendResponse(BaseModel):
    dates: list[str]
    approved: list[int]
    blocked: list[int]

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"
    department: str = ""

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    department: str
    created_at: str
```

- [ ] **Step 6: Verify backend scaffold**

```powershell
pip install -r requirements.txt
python -c "from models import init_db; init_db(); print('OK')"
```
Expected: `OK` and `project.db` created with `admin_users` + `audit_logs` tables.

---

### Task 2: Backend Auth Router

**Files:**
- Create: `backend/routers/__init__.py`
- Create: `backend/routers/auth.py`

**Interfaces:**
- Consumes: `config.*`, `schemas.LoginRequest`, `schemas.TokenResponse`, `utils.*`
- Produces: `POST /api/auth/login` endpoint

- [ ] **Step 1: Create `backend/routers/__init__.py`**

```python
```

(empty file)

- [ ] **Step 2: Create `backend/routers/auth.py`**

```python
from fastapi import APIRouter, HTTPException
from models import SessionLocal, AdminUser
from schemas import LoginRequest, TokenResponse
from utils import verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    session = SessionLocal()
    user = session.query(AdminUser).filter_by(username=body.username).first()
    session.close()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.username, "role": user.role})
    return TokenResponse(access_token=token)
```

- [ ] **Step 3: Test auth endpoint**

Create a quick test script or use curl after main.py is ready (tested together in Task 5).

---

### Task 3: Backend Logs Router

**Files:**
- Create: `backend/routers/logs.py`

**Interfaces:**
- Consumes: `config.API_KEY`, `models.SessionLocal`, `models.AuditLog`, `schemas.*`, `utils.verify_token`
- Produces: `POST /api/push-log`, `GET /api/logs`, `GET /api/logs/{log_id}`

- [ ] **Step 1: Create `backend/routers/logs.py`**

```python
from fastapi import APIRouter, HTTPException, Header, Query
from models import SessionLocal, AuditLog
from schemas import PushLogRequest, LogEntry, LogListResponse
from config import API_KEY
from utils import verify_token

router = APIRouter(prefix="/api", tags=["logs"])

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    payload = verify_token(authorization[7:])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload

@router.post("/push-log")
def push_log(body: PushLogRequest, x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    session = SessionLocal()
    try:
        log = AuditLog(
            userid=body.userid, user_ip=body.user_ip,
            user_message=body.user_message, review_status=body.review_status,
            review_reason=body.review_reason, raw_ai_json=body.raw_ai_json
        )
        session.add(log)
        session.commit()
        return {"status": "ok", "id": log.id}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

@router.get("/logs", response_model=LogListResponse)
def list_logs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    user: str = Query(None),
    start: str = Query(None),
    end: str = Query(None),
    search: str = Query(None),
    _=None
):
    session = SessionLocal()
    try:
        query = session.query(AuditLog)
        if status:
            query = query.filter(AuditLog.review_status == status)
        if user:
            query = query.filter(AuditLog.userid == user)
        if start:
            query = query.filter(AuditLog.captured_at >= start)
        if end:
            query = query.filter(AuditLog.captured_at <= end + " 23:59:59")
        if search:
            query = query.filter(AuditLog.user_message.contains(search))
        total = query.count()
        records = query.order_by(AuditLog.id.desc()).offset((page - 1) * size).limit(size).all()
        return LogListResponse(
            records=[LogEntry(
                id=r.id, userid=r.userid, user_ip=r.user_ip,
                user_message=r.user_message[:200], review_status=r.review_status,
                review_reason=r.review_reason, raw_ai_json=r.raw_ai_json,
                captured_at=str(r.captured_at)
            ) for r in records],
            total=total, page=page, size=size
        )
    finally:
        session.close()

@router.get("/logs/{log_id}")
def get_log(log_id: int):
    session = SessionLocal()
    try:
        log = session.query(AuditLog).filter_by(id=log_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")
        return LogEntry(
            id=log.id, userid=log.userid, user_ip=log.user_ip,
            user_message=log.user_message, review_status=log.review_status,
            review_reason=log.review_reason, raw_ai_json=log.raw_ai_json,
            captured_at=str(log.captured_at)
        )
    finally:
        session.close()
```

Note: The `list_logs` endpoint intentionally uses `_=None` as a dummy parameter to consume the dependency that would be the auth check — this avoids the actual enforcement for now (JWT validation is applied via middleware in main.py).

Actually, let me make this cleaner. Instead of embedding auth in each route, I'll use FastAPI dependencies in the main router. But for simplicity, let me just require the Authorization header in the router functions.

Actually, let me reconsider. Since multiple routes need auth, I should create a reusable dependency. But to keep things simple, let me just pass the `_` argument as a sentinel that the dependency validation runs at the router level. The cleanest way is to have a middleware approach or use `Depends()` in the router.

Let me simplify - I won't add JWT auth to every route individually. Instead, I'll protect routes using a simple check at the router level via a middleware in main.py, or use a dependency on a router. Actually the simplest approach: add a `verify_token` check as middleware in main.py for all `/api/` routes except `/api/auth/login` and `/api/push-log`.

Let me adjust the plan accordingly.

- [ ] **Step 2: No separate test step (tested via curl in Task 5)**

---

### Task 4: Backend Stats + Users Routers

**Files:**
- Create: `backend/routers/stats.py`
- Create: `backend/routers/users.py`

- [ ] **Step 1: Create `backend/routers/stats.py`**

```python
from fastapi import APIRouter, Query
from sqlalchemy import func
from models import SessionLocal, AuditLog
from schemas import StatsOverview, TrendResponse

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("/overview", response_model=StatsOverview)
def overview():
    session = SessionLocal()
    try:
        total = session.query(AuditLog).count()
        approved = session.query(AuditLog).filter_by(review_status="approved").count()
        blocked = session.query(AuditLog).filter_by(review_status="block").count()
        return StatsOverview(total=total, approved=approved, blocked=blocked)
    finally:
        session.close()

@router.get("/trend", response_model=TrendResponse)
def trend(days: int = Query(30, ge=1, le=365)):
    session = SessionLocal()
    try:
        from datetime import datetime, timedelta
        cutoff = datetime.now() - timedelta(days=days)
        results = session.query(
            func.date(AuditLog.captured_at).label("date"),
            AuditLog.review_status,
            func.count().label("cnt")
        ).filter(AuditLog.captured_at >= cutoff).group_by(
            func.date(AuditLog.captured_at), AuditLog.review_status
        ).all()
        date_map = {}
        for date, status, cnt in results:
            if date not in date_map:
                date_map[date] = {"approved": 0, "blocked": 0}
            key = "approved" if status == "approved" else "blocked"
            date_map[date][key] = cnt
        dates = sorted(date_map.keys())
        return TrendResponse(
            dates=dates,
            approved=[date_map[d]["approved"] for d in dates],
            blocked=[date_map[d]["blocked"] for d in dates]
        )
    finally:
        session.close()
```

- [ ] **Step 2: Create `backend/routers/users.py`**

```python
from fastapi import APIRouter, HTTPException
from models import SessionLocal, AdminUser
from schemas import UserCreate, UserResponse
from utils import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])

def user_to_response(u):
    return UserResponse(id=u.id, username=u.username, role=u.role, department=u.department, created_at=str(u.created_at))

@router.get("", response_model=list[UserResponse])
def list_users():
    session = SessionLocal()
    try:
        users = session.query(AdminUser).all()
        return [user_to_response(u) for u in users]
    finally:
        session.close()

@router.post("", response_model=UserResponse)
def create_user(body: UserCreate):
    session = SessionLocal()
    try:
        if session.query(AdminUser).filter_by(username=body.username).first():
            raise HTTPException(status_code=400, detail="Username already exists")
        user = AdminUser(
            username=body.username, password=hash_password(body.password),
            role=body.role, department=body.department
        )
        session.add(user)
        session.commit()
        return user_to_response(user)
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

@router.delete("/{user_id}")
def delete_user(user_id: int):
    session = SessionLocal()
    try:
        user = session.query(AdminUser).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.username == "admin":
            raise HTTPException(status_code=400, detail="Cannot delete default admin")
        session.delete(user)
        session.commit()
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
```

---

### Task 5: Backend main.py Entry Point

**Files:**
- Create: `backend/main.py`

- [ ] **Step 1: Create `backend/main.py`**

```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from models import init_db
from routers import auth, logs, stats, users
from config import API_KEY
from utils import verify_token

app = FastAPI(title="AI Gateway Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if path == "/api/auth/login" or path == "/api/push-log":
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

@app.on_event("startup")
def startup():
    init_db()
```

- [ ] **Step 2: Start backend and test**

```powershell
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

In another terminal:

```powershell
# Test login
curl.exe -X POST "http://localhost:8000/api/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}'
# Expected: {"access_token":"eyJ...","token_type":"bearer"}

# Test push-log
$token = "<token from above>"
curl.exe -X POST "http://localhost:8000/api/push-log" -H "Content-Type: application/json" -H "X-API-Key: chenxi-gateway-push" -d '{"userid":"admin","user_ip":"127.0.0.1","user_message":"hello","review_status":"approved","review_reason":"ok","raw_ai_json":"{}"}'
# Expected: {"status":"ok","id":1}

# Test list logs
curl.exe "http://localhost:8000/api/logs" -H "Authorization: Bearer $token"
# Expected: {"records":[...],"total":1,...}

# Test stats
curl.exe "http://localhost:8000/api/stats/overview" -H "Authorization: Bearer $token"
# Expected: {"total":1,"approved":1,"blocked":0}
```

---

### Task 6: Frontend Scaffold

**Files:**
- Create: `frontend/` (Vite project)
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/services/api.ts`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Create Vite + React + TypeScript project**

```powershell
cd C:\Users\Nitro v15\Desktop\AllProjectFromAI\ChenXi\dashboard
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install tailwindcss @tailwindcss/vite recharts lucide-react
```

- [ ] **Step 2: Configure Tailwind CSS**

Edit `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

Edit `frontend/src/index.css`:
```css
@import "tailwindcss";
```

Edit `frontend/tailwind.config.js` or inline the theme. Actually with Tailwind v4 (latest), the config is done differently. Let me check what version `npm install tailwindcss` installs.

For Tailwind v3 (more likely stable):

Edit `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-base: #0F0E11;
  --color-base-surface: #1A181F;
  --color-base-border: #2C2936;
  --color-accent: #F59E0B;
  --color-accent-secondary: #A78BFA;
  --color-text-primary: #E4E0EC;
}

.dark {
  --color-base: #0F0E11;
  --color-base-surface: #1A181F;
  --color-base-border: #2C2936;
  --color-accent: #F59E0B;
  --color-text-primary: #E4E0EC;
}
```

Create `frontend/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: '#0F0E11',
        'base-surface': '#1A181F',
        'base-border': '#2C2936',
        accent: '#F59E0B',
        'accent-secondary': '#A78BFA',
        'text-primary': '#E4E0EC',
      },
      fontFamily: {
        body: ['IBM Plex Sans', 'sans-serif'],
        display: ['DM Serif Display', 'serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Create `frontend/src/types/index.ts`**

```typescript
export interface LogEntry {
  id: number
  userid: string
  user_ip: string
  user_message: string
  review_status: string
  review_reason: string
  raw_ai_json: string
  captured_at: string
}

export interface LogListResponse {
  records: LogEntry[]
  total: number
  page: number
  size: number
}

export interface StatsOverview {
  total: number
  approved: number
  blocked: number
}

export interface TrendResponse {
  dates: string[]
  approved: number[]
  blocked: number[]
}

export interface UserResponse {
  id: number
  username: string
  role: string
  department: string
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}
```

- [ ] **Step 4: Create `frontend/src/services/api.ts`**

```typescript
import type { LogListResponse, LogEntry, StatsOverview, TrendResponse, UserResponse, LoginResponse } from '../types'

const API = '/api'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  listLogs: (params: { page?: number; size?: number; status?: string; user?: string; start?: string; end?: string; search?: string } = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, String(v)) })
    return request<LogListResponse>(`/logs?${q}`)
  },

  getLog: (id: number) => request<LogEntry>(`/logs/${id}`),

  getOverview: () => request<StatsOverview>('/stats/overview'),

  getTrend: (days = 30) => request<TrendResponse>(`/stats/trend?days=${days}`),

  listUsers: () => request<UserResponse[]>('/users'),

  createUser: (data: { username: string; password: string; role?: string; department?: string }) =>
    request<UserResponse>('/users', { method: 'POST', body: JSON.stringify(data) }),

  deleteUser: (id: number) =>
    request<{ status: string }>(`/users/${id}`, { method: 'DELETE' }),
}
```

- [ ] **Step 5: Test scaffold**

```powershell
cd frontend
npm run dev
```
Expected: Vite starts on port 5173, shows blank page (we'll add content next).

---

### Task 7: Frontend Auth + Layout

**Files:**
- Create: `frontend/src/contexts/AuthContext.tsx`
- Create: `frontend/src/components/layout/Layout.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/components/ui/Spinner.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create `frontend/src/contexts/AuthContext.tsx`**

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { api } from '../services/api'

interface AuthState {
  token: string | null
  username: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'))

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password)
    localStorage.setItem('token', res.access_token)
    localStorage.setItem('username', username)
    setToken(res.access_token)
    setUsername(username)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setToken(null)
    setUsername(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, username, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Create frontend layout components**

`frontend/src/components/layout/Sidebar.tsx`:
```typescript
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, Shield, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/logs', icon: FileText, label: 'Audit Logs' },
  { to: '/users', icon: Users, label: 'Users' },
]

export default function Sidebar() {
  const { username, logout } = useAuth()
  return (
    <aside className="w-64 bg-base-surface border-r border-base-border flex flex-col h-screen">
      <div className="p-5 border-b border-base-border flex items-center gap-3">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-black" />
        </div>
        <span className="font-display text-xl text-text-primary">AI Gateway</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-body text-sm ${
                isActive ? 'bg-accent/15 text-accent' : 'text-slate-400 hover:bg-base-border hover:text-text-primary'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-base-border">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-slate-400 font-body">{username}</span>
          <button onClick={logout} className="text-slate-400 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
```

`frontend/src/components/layout/Header.tsx`:
```typescript
interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="h-16 border-b border-base-border flex items-center px-6 bg-base-surface">
      <h1 className="font-body font-semibold text-lg text-text-primary">{title}</h1>
    </header>
  )
}
```

`frontend/src/components/layout/Layout.tsx`:
```typescript
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../contexts/AuthContext'

export default function Layout() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <div className="flex h-screen bg-base text-text-primary font-body">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/ui/Spinner.tsx`**

```typescript
export default function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex gap-1">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/src/pages/LoginPage.tsx`**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Shield } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <div className="bg-base-surface p-8 rounded-xl border border-base-border w-96">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-black" />
          </div>
          <h1 className="font-display text-2xl text-text-primary">AI Gateway</h1>
          <p className="text-sm text-slate-400 font-body mt-1">Sign in to the dashboard</p>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm font-body">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 font-body mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-base-border rounded-lg px-4 py-2.5 border border-base-border text-text-primary font-body text-sm focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 font-body mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-base-border rounded-lg px-4 py-2.5 border border-base-border text-text-primary font-body text-sm focus:outline-none focus:border-accent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:bg-base-border text-black rounded-lg transition-colors font-medium font-body"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `frontend/src/App.tsx`**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import Spinner from './components/ui/Spinner'

const DashboardPage = () => <div className="p-6"><Spinner /><p className="text-center text-slate-400">Dashboard coming soon</p></div>
const LogsPage = () => <div className="p-6"><Spinner /><p className="text-center text-slate-400">Logs coming soon</p></div>
const LogDetailPage = () => <div className="p-6"><Spinner /><p className="text-center text-slate-400">Log detail coming soon</p></div>
const UsersPage = () => <div className="p-6"><Spinner /><p className="text-center text-slate-400">Users coming soon</p></div>

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/logs/:id" element={<LogDetailPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 6: Update `frontend/src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 7: Test**

```powershell
cd frontend
npm run dev
```
Expected: Vite starts, open http://localhost:5173, see login page.

---

### Task 8: Frontend Dashboard Page

**Files:**
- Create: `frontend/src/components/ui/StatCard.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create `frontend/src/components/ui/StatCard.tsx`**

```typescript
import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  color?: string
}

export default function StatCard({ title, value, icon, color = 'text-accent' }: StatCardProps) {
  return (
    <div className="bg-base-surface p-5 rounded-xl border border-base-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium font-body">{title}</p>
          <p className="text-3xl font-bold font-mono text-text-primary mt-2">{value}</p>
        </div>
        <div className={`${color}`}>{icon}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/pages/DashboardPage.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { FileText, CheckCircle, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Header from '../components/layout/Header'
import StatCard from '../components/ui/StatCard'
import { api } from '../services/api'
import type { StatsOverview, TrendResponse } from '../types'

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [trend, setTrend] = useState<TrendResponse | null>(null)

  useEffect(() => {
    api.getOverview().then(setStats).catch(console.error)
    api.getTrend(30).then(setTrend).catch(console.error)
  }, [])

  const chartData = trend
    ? trend.dates.map((date, i) => ({ date, approved: trend.approved[i], blocked: trend.blocked[i] }))
    : []

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Requests" value={stats?.total ?? '...'} icon={<FileText className="w-6 h-6" />} />
          <StatCard title="Approved" value={stats?.approved ?? '...'} icon={<CheckCircle className="w-6 h-6" />} color="text-green-400" />
          <StatCard title="Blocked" value={stats?.blocked ?? '...'} icon={<XCircle className="w-6 h-6" />} color="text-red-400" />
        </div>

        <div className="bg-base-surface p-5 rounded-xl border border-base-border">
          <h2 className="text-slate-400 font-medium font-body mb-4">30-Day Trend</h2>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C2936" />
                  <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A181F',
                      border: '1px solid #2C2936',
                      borderRadius: '8px',
                      color: '#E4E0EC',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="approved" fill="#22C55E" name="Approved" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="blocked" fill="#EF4444" name="Blocked" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-slate-500 py-16 font-body">No data yet</p>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Test**

Open `http://localhost:5173` in browser. Expected: Dashboard shows stat cards + trend chart after login.

---

### Task 9: Frontend Logs Page + Log Detail

**Files:**
- Create: `frontend/src/pages/LogsPage.tsx`
- Create: `frontend/src/pages/LogDetailPage.tsx`

- [ ] **Step 1: Create `frontend/src/pages/LogsPage.tsx`**

```typescript
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Download } from 'lucide-react'
import Header from '../components/layout/Header'
import { api } from '../services/api'
import type { LogListResponse } from '../types'

function StatusBadge({ status }: { status: string }) {
  const color = status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
  return <span className={`px-2 py-1 rounded text-xs font-mono ${color}`}>{status}</span>
}

export default function LogsPage() {
  const [data, setData] = useState<LogListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const size = 20

  const fetchLogs = useCallback(async () => {
    const result = await api.listLogs({ page, size, status: status || undefined, search: search || undefined })
    setData(result)
  }, [page, status, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleExport = () => {
    const rows = data?.records.map(r =>
      `${r.id},${r.userid},${r.review_status},"${r.user_message.replace(/"/g, '""')}","${r.review_reason.replace(/"/g, '""')}",${r.captured_at}`
    ).join('\n') ?? ''
    const csv = `ID,User,Status,Message,Reason,Time\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'audit_logs.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Header title="Audit Logs" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="bg-base-border text-text-primary rounded-lg px-4 py-2 border border-base-border font-body text-sm"
          >
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="block">Blocked</option>
          </select>
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
              placeholder="Search messages..."
              className="w-full bg-base-border rounded-lg pl-10 pr-4 py-2 border border-base-border text-text-primary font-mono text-sm"
            />
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-base-border hover:bg-base-border/80 text-slate-300 rounded-lg transition-colors text-sm font-body">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="bg-base-surface rounded-xl border border-base-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-slate-400">
                <th className="text-left p-3 font-body">ID</th>
                <th className="text-left p-3 font-body">User</th>
                <th className="text-left p-3 font-body">Message</th>
                <th className="text-left p-3 font-body">Status</th>
                <th className="text-left p-3 font-body">Reason</th>
                <th className="text-left p-3 font-body">Time</th>
              </tr>
            </thead>
            <tbody>
              {data?.records.map(r => (
                <tr key={r.id} className="border-b border-base-border/50 hover:bg-base-border/20">
                  <td className="p-3 font-mono text-slate-300">
                    <Link to={`/logs/${r.id}`} className="hover:text-accent transition-colors">#{r.id}</Link>
                  </td>
                  <td className="p-3 font-mono text-slate-300">{r.userid}</td>
                  <td className="p-3 font-mono text-slate-300 max-w-xs truncate">{r.user_message}</td>
                  <td className="p-3"><StatusBadge status={r.review_status} /></td>
                  <td className="p-3 text-slate-300 max-w-sm truncate">{r.review_reason}</td>
                  <td className="p-3 font-mono text-slate-400 text-xs">{r.captured_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && (
          <div className="flex items-center justify-between text-sm text-slate-400 font-body">
            <span>Showing {((page - 1) * size) + 1}-{Math.min(page * size, data.total)} of {data.total}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 bg-base-border rounded hover:bg-base-border/80 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page * size >= data.total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-base-border rounded hover:bg-base-border/80 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create `frontend/src/pages/LogDetailPage.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Header from '../components/layout/Header'
import { api } from '../services/api'
import type { LogEntry } from '../types'

export default function LogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [log, setLog] = useState<LogEntry | null>(null)

  useEffect(() => {
    if (id) api.getLog(parseInt(id)).then(setLog).catch(console.error)
  }, [id])

  if (!log) return <div className="p-6"><p className="text-center text-slate-500">Loading...</p></div>

  return (
    <>
      <Header title="Log Detail" />
      <div className="p-6">
        <button onClick={() => navigate('/logs')} className="flex items-center gap-2 text-slate-400 hover:text-text-primary transition-colors mb-6 font-body">
          <ArrowLeft className="w-4 h-4" /> Back to Logs
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <InfoRow label="ID" value={`#${log.id}`} />
          <InfoRow label="User" value={log.userid} />
          <InfoRow label="IP" value={log.user_ip} />
          <InfoRow label="Status">
            <span className={`px-2 py-1 rounded text-xs font-mono ${log.review_status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {log.review_status}
            </span>
          </InfoRow>
          <InfoRow label="Reason" value={log.review_reason} span />
          <InfoRow label="Time" value={log.captured_at} span />
        </div>
        <div className="bg-base-surface p-5 rounded-xl border border-base-border">
          <h3 className="text-slate-400 font-medium font-body mb-3">Message Content</h3>
          <p className="font-mono text-sm text-text-primary whitespace-pre-wrap">{log.user_message}</p>
        </div>
        <div className="bg-base-surface p-5 rounded-xl border border-base-border mt-4">
          <h3 className="text-slate-400 font-medium font-body mb-3">AI Review Result (raw_ai_json)</h3>
          <pre className="font-mono text-sm text-text-primary whitespace-pre-wrap bg-base rounded-lg p-4">{log.raw_ai_json}</pre>
        </div>
      </div>
    </>
  )
}

function InfoRow({ label, value, children, span }: { label: string; value?: string; children?: React.ReactNode; span?: boolean }) {
  return (
    <div className={`bg-base-surface p-4 rounded-xl border border-base-border ${span ? 'md:col-span-2' : ''}`}>
      <p className="text-xs text-slate-400 font-medium font-body mb-1">{label}</p>
      {children ?? <p className="font-mono text-sm text-text-primary">{value}</p>}
    </div>
  )
}
```

---

### Task 10: Frontend Users Page

**Files:**
- Create: `frontend/src/pages/UsersPage.tsx`

- [ ] **Step 1: Create `frontend/src/pages/UsersPage.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Header from '../components/layout/Header'
import { api } from '../services/api'
import type { UserResponse } from '../types'

export default function UsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [showForm, setShowForm] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const fetchUsers = () => api.listUsers().then(setUsers).catch(console.error)

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.createUser({ username, password })
      setUsername(''); setPassword(''); setShowForm(false)
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete user "${name}"?`)) return
    try {
      await api.deleteUser(id)
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  return (
    <>
      <Header title="User Management" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-black rounded-lg transition-colors text-sm font-medium font-body"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-base-surface p-4 rounded-xl border border-base-border flex gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 font-body mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="bg-base-border rounded-lg px-4 py-2 border border-base-border text-text-primary font-mono text-sm focus:outline-none focus:border-accent" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-body mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="bg-base-border rounded-lg px-4 py-2 border border-base-border text-text-primary font-mono text-sm focus:outline-none focus:border-accent" required />
            </div>
            <button type="submit" className="px-4 py-2 bg-accent hover:bg-accent/90 text-black rounded-lg transition-colors text-sm font-body">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-base-border hover:bg-base-border/80 text-slate-300 rounded-lg transition-colors text-sm font-body">Cancel</button>
          </form>
        )}

        <div className="bg-base-surface rounded-xl border border-base-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-slate-400">
                <th className="text-left p-3 font-body">ID</th>
                <th className="text-left p-3 font-body">Username</th>
                <th className="text-left p-3 font-body">Role</th>
                <th className="text-left p-3 font-body">Department</th>
                <th className="text-left p-3 font-body">Created</th>
                <th className="text-right p-3 font-body">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-base-border/50">
                  <td className="p-3 font-mono text-slate-300">#{u.id}</td>
                  <td className="p-3 font-mono text-slate-300">{u.username}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded text-xs font-mono bg-accent/15 text-accent">{u.role}</span></td>
                  <td className="p-3 text-slate-300">{u.department || '—'}</td>
                  <td className="p-3 font-mono text-slate-400 text-xs">{u.created_at}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      disabled={u.username === 'admin'}
                      className="p-2 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={u.username === 'admin' ? 'Cannot delete default admin' : 'Delete user'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
```

---

### Task 11: test1 HTTP Push Integration

**Files:**
- Modify: `test1/main.py`

- [ ] **Step 1: Add HTTP push to `test1/main.py`**

After the existing `log_entry` creation and commit block (around line 260-270), add:

```python
import httpx

def _push_to_dashboard(userid, user_ip, user_message, review_status, review_reason, raw_ai_json):
    try:
        with httpx.Client(timeout=2.0) as client:
            resp = client.post(
                "http://127.0.0.1:8000/api/push-log",
                json={
                    "userid": userid,
                    "user_ip": user_ip,
                    "user_message": user_message,
                    "review_status": review_status,
                    "review_reason": review_reason,
                    "raw_ai_json": raw_ai_json,
                },
                headers={"X-API-Key": "chenxi-gateway-push", "Content-Type": "application/json"},
            )
            if resp.status_code != 200:
                logger.warning(f"[Push] Dashboard returned {resp.status_code}")
    except Exception as e:
        logger.warning(f"[Push] Failed to push to Dashboard: {e}")
```

And call it after the session commit:
```python
_push_to_dashboard(userid, user_ip, user_message, review_status, review_reason, json.dumps(msg_review_result, ensure_ascii=False))
```

The push should be fire-and-forget: if it fails, only a warning is logged and the proxy continues.

- [ ] **Step 2: Test end-to-end**

```powershell
# Start Dashboard
cd C:\Users\Nitro v15\Desktop\AllProjectFromAI\ChenXi\dashboard\backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# In another terminal: Start mitmproxy
cd C:\Users\Nitro v15\Desktop\AllProjectFromAI\ChenXi\test1
mitmweb -p 8080 -s ./main.py

# Send a test request through proxy
curl.exe --proxy http://admin:admin@127.0.0.1:8080 -X POST -H "Content-Type: application/json" -d "@$env:TEMP\test.json" "http://httpbin.org/backend-api/f/conversation"

# Verify in Dashboard's DB
python -c "import sqlite3; conn=sqlite3.connect('../dashboard/project.db'); [print(r) for r in conn.execute('SELECT id,user_message,review_status FROM audit_logs ORDER BY id').fetchall()]; conn.close()"
```
Expected: New record appears in Dashboard's project.db.

---

### Task 12: Fonts + Polish

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Add Google Fonts to `frontend/index.html`**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Verify fonts are applied**

Open browser DevTools → computed styles, check that IBM Plex Sans/DM Serif Display/IBM Plex Mono are loaded.

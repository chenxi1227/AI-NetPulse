# ChenXi AI Gateway Dashboard — 设计文档

## 1. 架构

```
test1 (mitmproxy addon)
  │
  ├── 1. 写本地 gateway.db（fallback）
  │
  └── 2. POST /api/ingest/push → Dashboard (:8000)
        ├── 超时 2s，失败直接丢弃记 warning
        ├── 不重试，防止拖垮代理
        └── 写入 Dashboard 的 dashboard.db（权威数据源）

Dashboard (FastAPI :8000, WAL 模式)
  │
  ├── 启动时自动创建默认 admin/admin（零手动操作）
  ├── JWT 令牌 7 天过期
  │
  └── React 前端 (:5173) ← 同 NetPulse 设计体系
```

## 2. 页面

| 路由 | 页面 | 说明 |
|---|---|---|
| `/login` | 登录页 | admin 密码登录 |
| `/` | 总览 | 统计卡片(总/approved/blocked/今日/唯一用户) + 按天趋势图 |
| `/logs` | 审计日志 | 表格 + 筛选(status/user/日期/搜索) + 排序 + 分页大小 + CSV 导出 |
| `/logs/:id` | 日志详情 | 完整信息 + raw_ai_json 树形展示 |
| `/users` | 用户管理 | admin 账号列表 + 新增 + 删除 |

## 3. API

### 公开接口（无认证）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录，返回 Access Token(30min) + Refresh Token(7天) |

### 内部接口（API Key 认证）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/ingest/push` | test1 推送日志，超时 2s，失败记 warning |

### 需 JWT 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/logs?page&size&status&user&start&end&search&sort&page_size` | 日志列表（分页+排序） |
| GET | `/api/logs/:id` | 单条详情 |
| GET | `/api/logs/export/csv` | 导出当前筛选结果为 CSV |
| GET | `/api/stats/overview` | 统计概览（总/approved/blocked/今日/唯一用户） |
| GET | `/api/stats/trend?days=30` | 按天趋势 |
| GET | `/api/users` | 用户列表 |
| POST | `/api/users` | 新增用户 |
| DELETE | `/api/users/:id` | 删除用户 |

## 4. 数据库（Dashboard 独有，WAL 模式）

```sql
CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    department TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT UNIQUE NOT NULL,
    userid TEXT,
    user_ip TEXT,
    user_message TEXT,
    review_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK(review_status IN ('APPROVED','BLOCKED','PENDING','ERROR')),
    review_reason TEXT,
    raw_ai_json TEXT,
    model_name TEXT DEFAULT '',
    model_version TEXT DEFAULT '',
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_status ON audit_logs(review_status);
CREATE INDEX idx_logs_captured_at ON audit_logs(captured_at);
CREATE INDEX idx_logs_userid ON audit_logs(userid);
```

启动时 `PRAGMA journal_mode=WAL` + `PRAGMA busy_timeout=5000`，空数据库自动插入 `admin/admin`。

## 5. 数据流

```
审核完成 → test1 写入本地 gateway.db → test1 POST /api/ingest/push (带 request_id)
                                              ↓
                                      Dashboard 写入 dashboard.db
                                              ↓
                                      React 前端读取展示
```

## 6. 前端设计（NetPulse 风格）

| 元素 | 方案 |
|---|---|
| 框架 | React 18 + TypeScript + Vite 5 |
| CSS | Tailwind CSS 3（暗色主题 `#0F0E11`，琥珀色 `#F59E0B` 强调） |
| 图表 | Recharts（柱状图 + 折线图） |
| 图标 | Lucide React |
| 字体 | IBM Plex Sans（正文）+ DM Serif Display（标题）+ IBM Plex Mono（数据） |
| 布局 | 左侧边栏 + 顶栏 + 内容区（同 NetPulse Layout） |

### 组件映射

| NetPulse 组件 | Dashboard 复用 |
|---|---|
| `Layout` / `Sidebar` / `Header` | 侧边栏 3 项：Dashboard / Logs / Users |
| `StatusCard` | 统计卡片（总日志数 / approved / blocked / today） |
| `CpuChart` / `TrafficChart` | 按天趋势条形图（双色） |
| HistoryPage table | 审计日志表格 + 筛选 + 排序 + 导出 |
| SettingsPage table | 用户管理表格 |

## 7. 目录结构

```
ChenXi/dashboard/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # Layout, Sidebar, Header
│   │   │   ├── ui/           # Card, Badge, Spinner, StatusBadge, JsonViewer
│   │   │   └── charts/       # TrendChart
│   │   ├── pages/            # Login, Dashboard, Logs, LogDetail, Users
│   │   ├── services/         # api.ts
│   │   ├── contexts/         # AuthContext
│   │   ├── types/            # index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── main.py               # FastAPI 入口 + CORS + lifespan
│   ├── config.py             # 从 .env 加载
│   ├── models.py             # SQLAlchemy 模型 + init_db()
│   ├── schemas.py            # Pydantic 请求/响应
│   ├── routers/
│   │   ├── auth.py           # POST /login
│   │   ├── ingest.py         # POST /push (内部 API Key)
│   │   ├── logs.py           # GET /logs, GET /logs/:id, GET /logs/export/csv
│   │   ├── stats.py          # GET /overview, GET /trend
│   │   └── users.py          # GET/POST/DELETE /users
│   ├── utils.py              # JWT encode/decode, hash_password
│   ├── .env                  # JWT_SECRET, API_KEY
│   └── requirements.txt
└── dashboard.db              # SQLite（权威数据源）
```

## 8. 设计决策索引

| 决策 | 说明 |
|---|---|
| password_hash | 数据库不存明文，字段名明确标识为 hash |
| review_status ENUM | APPROVED/BLOCKED/PENDING/ERROR，防止脏数据 |
| request_id UUID | 防重复推送，幂等写入 |
| 数据库索引 | status + captured_at + userid 三索引 |
| ingest 独立路由 | push-log 不属于 logs API，职责分离 |
| dashboard.db | 明确命名，与 test1 的 gateway.db 区分 |
| CSV 导出当前筛选 | 不是全量导出 |
| 分页大小可选 | 20/50/100 三级 |
| 排序方向 | newest/oldest |
| 模型信息 | audit_logs 记录 model_name + model_version |
| is_active | 用户可禁用而非删除 |
| .env 配置 | JWT_SECRET + API_KEY 不硬编码 |

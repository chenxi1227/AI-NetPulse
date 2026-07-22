#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Auto-setup if needed
NEED_SETUP=
if [ ! -d "$ROOT/.venv" ] || [ ! -d "$ROOT/dashboard/dashboard/frontend/node_modules" ]; then
    NEED_SETUP=1
fi
if [ ! -f "$ROOT/.env" ]; then
    NEED_SETUP=1
fi
if [ -n "$NEED_SETUP" ]; then
    echo "[start] First run detected — running setup..."
    python3 "$ROOT/setup.py"
fi

echo ""
echo "Starting AI Proxy Dashboard..."
echo "================================"

BACKEND="$ROOT/dashboard/dashboard/backend"
FRONTEND="$ROOT/dashboard/dashboard/frontend"
MITM_CMD="$ROOT/.venv/bin/mitmdump"
UVICORN_CMD="$ROOT/.venv/bin/uvicorn"

# Start mitmproxy
if [ -f "$MITM_CMD" ]; then
    echo "[start] Starting mitmproxy..."
    "$MITM_CMD" -q -s "$ROOT/main_files.py" --set block_global=false &
fi

# Start backend
echo "[start] Starting backend..."
cd "$BACKEND"
if [ -f "$UVICORN_CMD" ]; then
    "$UVICORN_CMD" main:app --host 0.0.0.0 --port 8000 &
else
    uvicorn main:app --host 0.0.0.0 --port 8000 &
fi
BACKEND_PID=$!

# Start frontend
echo "[start] Starting frontend..."
cd "$FRONTEND"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "All services started. Press Ctrl+C to stop."
echo "  Dashboard:  http://localhost:5173"
echo "  Backend:    http://localhost:8000"
echo "  Docs:       http://localhost:8000/docs"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait

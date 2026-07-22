@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "VENV_PY=%ROOT%.venv\Scripts\python.exe"
set "NEED_SETUP="

if not exist "%VENV_PY%" set NEED_SETUP=1
if not exist "%ROOT%dashboard\dashboard\frontend\node_modules" set NEED_SETUP=1
if not exist "%ROOT%.env" set NEED_SETUP=1

if defined NEED_SETUP (goto :RUN_SETUP) else (goto :START_SERVICES)

:RUN_SETUP
echo [start] First run detected -- running setup...
set "PY_CMD="
where py >nul 2>nul
if errorlevel 1 goto :CHECK_DEFAULT_PYTHON
py -3.12 -c "import sys" >nul 2>nul
if errorlevel 1 goto :CHECK_DEFAULT_PYTHON
set "PY_CMD=py -3.12"
goto :FOUND_PYTHON

:CHECK_DEFAULT_PYTHON
where python >nul 2>nul
if errorlevel 1 goto :PYTHON_NOT_FOUND
python -c "import sys; sys.version_info.major == 3 and sys.version_info.minor == 12 or sys.exit(1)" >nul 2>nul
if errorlevel 1 goto :PYTHON_NOT_FOUND
set "PY_CMD=python"
goto :FOUND_PYTHON

:PYTHON_NOT_FOUND
echo [start] ERROR: Python 3.12 is REQUIRED to run this project.
echo [start] Please install Python 3.12 (and check 'Add python.exe to PATH') then try again.
pause
exit /b 1

:FOUND_PYTHON
echo [start] Using Python command: !PY_CMD!
!PY_CMD! "%ROOT%setup.py"
if errorlevel 1 (
    echo [start] ERROR: Setup failed. Check messages above.
    pause
    exit /b 1
)
if not exist "%VENV_PY%" (
    echo [start] ERROR: Virtual env not created after setup.
    pause
    exit /b 1
)

:START_SERVICES
echo.
echo Starting AI Proxy Dashboard...
echo ================================

set "BACKEND=%ROOT%dashboard\dashboard\backend"
set "FRONTEND=%ROOT%dashboard\dashboard\frontend"
set "MITM_SCRIPT=%ROOT%main_files.py"

echo [start] Starting backend...
cd /d "%BACKEND%"
start /b "" "%VENV_PY%" -m uvicorn main:app --host 0.0.0.0 --port 8000

echo [start] Starting frontend...
cd /d "%FRONTEND%"
start /b "" cmd /c "npm run dev"

echo [start] Starting mitmdump proxy...
cd /d "%ROOT%"
start /b "" "%ROOT%.venv\Scripts\mitmdump.exe" -s "%MITM_SCRIPT%" --set listen_port=8080

echo.
echo ============================================
echo All services started!
echo Traffic listening on port: 8080
echo Dashboard: http://localhost:5173
echo ============================================
echo.
echo Press any key to STOP all services...
pause >nul

echo [stop] Stopping services...
taskkill /f /im mitmdump.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo [stop] All stopped.
choice /t 2 /d y /n >nul

@echo off
setlocal enabledelayedexpansion
set "ROOT=%~dp0"
set "VENV_PY=%ROOT%.venv\Scripts\python.exe"

set "NEED_SETUP="
if not exist "%VENV_PY%" set NEED_SETUP=1
if not exist "%ROOT%dashboard\dashboard\frontend\node_modules" set NEED_SETUP=1
if not exist "%ROOT%.env" set NEED_SETUP=1

if not defined NEED_SETUP goto :START_SERVICES

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

python -c "import sys; sys.exit(0 if sys.version_info.major == 3 and sys.version_info.minor == 12 else 1)" >nul 2>nul
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

echo [start] Setting system proxy to 127.0.0.1:8080...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer /t REG_SZ /d "127.0.0.1:8080" /f >nul 2>&1

echo [start] Starting backend...
start "AI_PROXY_BACKEND" /D "%BACKEND%" "%VENV_PY%" -m uvicorn main:app --host 0.0.0.0 --port 8000

echo [start] Starting frontend...
start "AI_PROXY_FRONTEND" /D "%FRONTEND%" cmd /c "title AI_PROXY_FRONTEND && npm run dev"

echo [start] Starting mitmdump proxy...
start "AI_PROXY_MITM" cmd /c "title AI_PROXY_MITM && "%ROOT%.venv\Scripts\mitmdump.exe" -s "%MITM_SCRIPT%" --set listen_port=8080"

echo.
echo ============================================
echo  All services started!
echo  Now you can talk to ChatGPT normally.
echo  Traffic is being captured and sent to:
echo    Dashboard: http://localhost:5173
echo ============================================
echo.
echo  Press any key to STOP all services and
echo  restore system proxy settings...
pause >nul

echo [stop] Restoring system proxy...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f >nul 2>&1

echo [stop] Stopping services...

taskkill /f /t /fi "WINDOWTITLE eq AI_PROXY_BACKEND*" >nul 2>&1
taskkill /f /t /fi "WINDOWTITLE eq AI_PROXY_FRONTEND*" >nul 2>&1
taskkill /f /t /fi "WINDOWTITLE eq AI_PROXY_MITM*" >nul 2>&1

taskkill /f /im mitmdump.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

echo [stop] All stopped.
choice /t 2 /d y /n >nul

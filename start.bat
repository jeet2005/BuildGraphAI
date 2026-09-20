@echo off
setlocal

echo ========================================
echo BuildGraph AI - Hackathon Demo Launcher
echo ========================================
echo.

echo [1/4] Checking prerequisites...

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python 3.10+ not found
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js 18+ not found
    pause
    exit /b 1
)

echo [OK] Python and Node.js found
echo.

echo [2/4] Preparing backend...
cd /d "%~dp0backend"

if not exist ".env" (
    echo [INFO] Creating backend\.env from backend\.env.example
    copy ".env.example" ".env" >nul
    echo [INFO] Edit backend\.env to set MongoDB Atlas or GROQ_API_KEY values if needed.
)

if not exist "venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
echo [INFO] Installing backend dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Backend dependency install failed
    pause
    exit /b 1
)

echo [3/4] Seeding demo data...
python seed_data.py
if %errorlevel% neq 0 (
    echo [ERROR] Database seed failed. Check MONGODB_URL in backend\.env.
    pause
    exit /b 1
)

echo [INFO] Starting backend on http://localhost:8000
start "BuildGraph Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && uvicorn app.main:app --port 8000"

echo.
echo [4/4] Starting frontend...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Frontend dependency install failed
        pause
        exit /b 1
    )
)

start "BuildGraph Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================
echo Services launching
echo ========================================
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Keep the service windows open while demoing.
pause

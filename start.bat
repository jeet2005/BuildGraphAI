@echo off
echo ========================================
echo BuildGraph AI - Hackathon Demo Launcher
echo ========================================
echo.

echo [1/4] Checking prerequisites...

where mongod >nul 2>nul
if %errorlevel% neq 0 (
    echo WARNING: MongoDB not found in PATH
    echo Please ensure MongoDB is installed and running on port 27017
) else (
    echo OK: MongoDB found
)

where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo WARNING: Ollama not found in PATH
    echo Please install from https://ollama.ai and run: ollama pull qwen2.5:3b
) else (
    echo OK: Ollama found
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Python not found
    pause
    exit /b 1
) else (
    echo OK: Python found
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found
    pause
    exit /b 1
) else (
    echo OK: Node.js found
)

echo.
echo [2/4] Starting MongoDB...
net start MongoDB >nul 2>nul
if %errorlevel% equ 0 (
    echo OK: MongoDB started
) else (
    echo INFO: MongoDB may already be running
)

echo.
echo [3/4] Starting Ollama...
start /B ollama serve >nul 2>nul
timeout /t 3 >nul
ollama list | findstr qwen2.5:3b >nul
if %errorlevel% neq 0 (
    echo WARNING: qwen2.5:3b model not found
    echo Pulling model (this may take a few minutes)...
    ollama pull qwen2.5:3b
) else (
    echo OK: Model qwen2.5:3b available
)

echo.
echo [4/4] Starting Backend & Frontend...
echo.
echo Backend will run on: http://localhost:8000
echo Frontend will run on: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop all services
echo.

cd backend
call venv\Scripts\activate.bat 2>nul || python -m venv venv && call venv\Scripts\activate.bat && pip install -r requirements.txt
python seed_data.py
start "BuildGraph Backend" cmd /k "uvicorn app.main:app --reload --port 8000"

cd ..\frontend
if not exist node_modules npm install
start "BuildGraph Frontend" cmd /k "npm run dev"

echo.
echo Both services starting in separate windows...
echo Wait a few seconds then open http://localhost:5173
pause
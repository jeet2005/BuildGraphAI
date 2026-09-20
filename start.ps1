# BuildGraph AI - Hackathon Demo Launcher (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BuildGraph AI - Hackathon Demo Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Checking prerequisites..." -ForegroundColor Yellow

$checks = @(
    @{ Name = "MongoDB"; Command = "mongod --version" },
    @{ Name = "Ollama"; Command = "ollama --version" },
    @{ Name = "Python"; Command = "python --version" },
    @{ Name = "Node.js"; Command = "node --version" }
)

foreach ($check in $checks) {
    try {
        $result = & $check.Command 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK: $($check.Name) - $result" -ForegroundColor Green
        } else {
            Write-Host "  WARNING: $($check.Name) not found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  WARNING: $($check.Name) not found" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[2/4] Starting MongoDB..." -ForegroundColor Yellow
try {
    $svc = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -ne "Running") {
        Start-Service -Name "MongoDB"
        Write-Host "  OK: MongoDB started" -ForegroundColor Green
    } elseif ($svc -and $svc.Status -eq "Running") {
        Write-Host "  OK: MongoDB already running" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: MongoDB service not found, please start manually" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  WARNING: Could not start MongoDB service" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/4] Starting Ollama..." -ForegroundColor Yellow
$ollamaProcess = Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 3

$models = ollama list 2>$null
if ($models -match "qwen2.5:3b") {
    Write-Host "  OK: Model qwen2.5:3b available" -ForegroundColor Green
} else {
    Write-Host "  Pulling qwen2.5:3b model (this may take a few minutes)..." -ForegroundColor Yellow
    ollama pull qwen2.5:3b
    Write-Host "  OK: Model pulled" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/4] Starting Backend & Frontend..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend will run on: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend will run on: http://localhost:5173" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Gray
Write-Host ""

# Backend
Set-Location backend
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}
& .\venv\Scripts\Activate.ps1
pip install -r requirements.txt -q
Write-Host "Seeding demo data..." -ForegroundColor Yellow
python seed_data.py

$backendProcess = Start-Process -FilePath "cmd" -ArgumentList "/k", "uvicorn app.main:app --reload --port 8000" -WindowTitle "BuildGraph Backend" -PassThru

# Frontend
Set-Location ..\frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

$frontendProcess = Start-Process -FilePath "cmd" -ArgumentList "/k", "npm run dev" -WindowTitle "BuildGraph Frontend" -PassThru

Write-Host ""
Write-Host "Both services starting in separate windows..." -ForegroundColor Green
Write-Host "Wait a few seconds then open http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to exit launcher (services will continue running)..." -ForegroundColor Gray
Read-Host
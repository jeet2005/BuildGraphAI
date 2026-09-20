# BuildGraph AI — Connected Intelligence for Construction

**Local-first AI, zero cloud costs.** Hackathon-ready construction project intelligence layer.

## Architecture

```
React + Vite + Tailwind (Port 5173)
         ↓
FastAPI + Motor (Port 8000)
         ↓
┌─────────────────────────────────┐
│  MongoDB (Local or Atlas)       │
│  Ollama (Local LLM)             │
│  FAISS + sentence-transformers  │
└─────────────────────────────────┘
```

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| MongoDB | 6.0+ | Database (local or Atlas) |
| Ollama | Latest | Local LLM runtime |
| Python | 3.10+ | Backend |
| Node.js | 18+ | Frontend |

## Quick Start (Windows)

### Option 1: Automated (Recommended)
```cmd
start.bat
```
This launches MongoDB, Ollama, backend, and frontend in separate windows.

### Option 2: Manual Steps

**1. Start MongoDB**
```cmd
# If installed as service
net start MongoDB

# Or run manually
mongod --dbpath C:\data\db
```

**2. Start Ollama**
```cmd
ollama pull qwen2.5:3b
ollama serve
```

**3. Backend**
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed_data.py
uvicorn app.main:app --reload --port 8000
```

**4. Frontend** (new terminal)
```cmd
cd frontend
npm install
npm run dev
```

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| MongoDB | mongodb://localhost:27017 |

## MongoDB Atlas (Optional)

Edit `backend/.env`:
```env
MONGODB_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/buildgraph?retryWrites=true&w=majority
MONGODB_DB_NAME=buildgraph
```
No code changes needed — config reads from environment.

## Demo Flow

1. **Open** http://localhost:5173
2. **Select Role** — Project Manager, Site Engineer, Contractor, or Management
3. **Dashboard** — Role-specific priorities + AI recommendation
4. **Project Graph** — Visual graph; search "ST-104" to highlight
5. **Impact Simulator** — Pick "Steel ST-104" → Run simulation → View propagation
6. **Data Trust** — See Floor 4 progress conflict (35% vs 20% vs 45%)
7. **Project Memory** — Click "Supplier B Selected" → Ask AI "Why?"
8. **AI Chat** (bottom-right) — Ask: *"What happens if steel is delayed 5 days?"*

## Intentional Demo Problems (Seeded)

| # | Problem | Location |
|---|---------|----------|
| 1 | Steel ST-104 delayed 5 days | All 3 buildings, Floors 4-6 |
| 2 | Floor 4 progress conflict | Building A Floor 4 Structural |
| 3 | Electrical blocked by structural | Building A Floor 4 Electrical |
| 4 | Concrete consumption +8% | Floors 1-3 |
| 5 | Supplier decision recorded | Project Memory → Procurement |

## Project Structure

```
BuildGraphAI/
├── backend/
│   ├── app/
│   │   ├── api/           # 9 FastAPI routers
│   │   ├── models/        # Pydantic schemas
│   │   ├── services/      # Impact, Conflict, AI, Docs
│   │   └── core/          # Config, DB
│   ├── seed_data.py       # Demo data (50 tasks, 8 contractors)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/         # 6 pages
│   │   ├── components/    # Layout, AIChat, NodePanel
│   │   └── context/       # Auth
│   └── package.json
├── start.bat / start.ps1
└── .env.example
```

## Key Features

- **4 Role-aware Dashboards** — PM, Site Engineer, Contractor, Management
- **React Flow Graph** — AI-highlighted subgraphs
- **Impact Simulator** — What-if delay propagation
- **Data Trust Engine** — Auto-detects progress conflicts
- **Project Memory** — Decision log with AI Q&A
- **Local AI** — Ollama + FAISS (no API keys)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Ollama not responding | `ollama serve` running? Model pulled? |
| MongoDB connection failed | Service running? Check `.env` URL |
| Frontend build errors | `rm -rf node_modules && npm install` |
| 8GB RAM | Use `ollama pull qwen2.5:1.5b` and update `.env` |

## License

MIT — Built for hackathon demo.
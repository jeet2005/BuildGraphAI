# BuildGraph AI — Connected Intelligence for Construction

Hackathon-ready construction project intelligence layer with a React dashboard, FastAPI backend, MongoDB storage, Groq chat, and local embeddings.

## Architecture

```
React + Vite + Tailwind (Port 5173)
         ↓
FastAPI + Motor (Port 8000)
         ↓
┌─────────────────────────────────┐
│  MongoDB (Local or Atlas)       │
│  Groq Chat API                  │
│  FAISS + sentence-transformers  │
└─────────────────────────────────┘
```

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| MongoDB | 6.0+ | Database (local or Atlas) |
| Groq API Key | Optional | AI chat and explanations |
| Python | 3.10+ | Backend |
| Node.js | 18+ | Frontend |

## Quick Start (Windows)

### Option 1: Automated (Recommended)
```cmd
start.bat
```
This prepares the backend, seeds demo data, and launches backend and frontend in separate windows.

### Option 2: Manual Steps

**1. Configure environment**
```cmd
cd backend
copy .env.example .env
```
Edit `backend\.env` if you want MongoDB Atlas or Groq AI responses. The default MongoDB URL uses local MongoDB.

**2. Start MongoDB**
```cmd
# If installed as service
net start MongoDB

# Or use MongoDB Atlas by setting MONGODB_URL in backend\.env
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
GROQ_API_KEY=<optional-groq-api-key>
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
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
└── backend/.env.example
```

## Key Features

- **4 Role-aware Dashboards** — PM, Site Engineer, Contractor, Management
- **React Flow Graph** — AI-highlighted subgraphs
- **Impact Simulator** — What-if delay propagation
- **Data Trust Engine** — Auto-detects progress conflicts
- **Project Memory** — Decision log with AI Q&A
- **AI Assistance** — Groq chat + FAISS-backed local embeddings

## Troubleshooting

| Issue | Fix |
|-------|-----|
| MongoDB connection failed | Service running? Check `.env` URL |
| Frontend build errors | Delete `frontend/node_modules`, then run `npm install` |
| Backend import errors | Re-run `pip install -r backend/requirements.txt` inside the backend venv |
| AI answers unavailable | Set `GROQ_API_KEY` in `backend/.env`; non-AI fallback responses still work |

## License

MIT — Built for hackathon demo.

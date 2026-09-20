# BuildGraph AI — ₹0 Hackathon Project

Connected intelligence layer for construction projects. Local-first AI, zero cloud costs.

## Architecture

```
Frontend (React + Vite + Tailwind) → Backend (FastAPI) → MongoDB
                                              ↓
                                    Ollama (Local LLM)
                                              ↓
                                    FAISS + sentence-transformers (RAG)
```

## Prerequisites

- **MongoDB** running locally on port 27017
- **Ollama** installed with `qwen2.5:3b` model
- **Python 3.10+**
- **Node.js 18+**

## Quick Start

### 1. Start MongoDB
```bash
# Windows
net start MongoDB

# Or start manually
mongod --dbpath /data/db
```

### 2. Start Ollama with local model
```bash
# Install Ollama from https://ollama.ai
ollama pull qwen2.5:3b
ollama serve
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python seed_data.py  # Seed demo data
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 5. Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Demo Flow

1. **Select Role** — Choose Project Manager, Site Engineer, Contractor, or Management
2. **Dashboard** — Role-specific priorities and AI recommendations
3. **Project Graph** — Visual graph with AI-powered highlighting
4. **Impact Simulator** — Simulate delays and see downstream effects
5. **Data Trust** — Detect progress conflicts across sources
6. **Project Memory** — Query historical decisions with AI
7. **AI Chat** — Floating assistant for natural language queries

## Key Features

| Feature | Description |
|---------|-------------|
| **Role-Aware Dashboards** | 4 distinct views for PM, Site Engineer, Contractor, Management |
| **Project Graph** | React Flow visualization with AI highlighting |
| **Impact Simulation** | What-if analysis with downstream propagation |
| **Data Trust Engine** | Detects progress source conflicts automatically |
| **Project Memory** | Decision log with AI-powered retrieval |
| **Local AI** | Ollama + sentence-transformers + FAISS (no API costs) |
| **Fallback Logic** | Rule-based responses when Ollama unavailable |

## Demo Data: Skyline Business Park

- **Value**: ₹42.8 Cr
- **Buildings**: 3 (12 floors each)
- **Contractors**: 8
- **Materials**: 25
- **Tasks**: 50

### Intentional Problems (for demo)
1. **Steel ST-104** delayed 5 days → affects 4 downstream tasks across 3 buildings
2. **Floor 4 Progress Conflict** — Schedule 35% vs Site 20% vs Contractor 45%
3. **Electrical Installation** blocked by structural delay
4. **Concrete Consumption** +8% above plan on Floors 1-3
5. **Supplier Decision** recorded in Project Memory (Supplier B chosen for earlier delivery)

## API Endpoints

```
GET  /api/v1/projects              # List projects
GET  /api/v1/projects/{id}         # Get project
GET  /api/v1/graph/{projectId}     # Project graph
GET  /api/v1/graph/{projectId}/highlight/{entityId}  # Highlighted subgraph
GET  /api/v1/entities/{projectId}/tasks
GET  /api/v1/entities/{projectId}/materials
GET  /api/v1/entities/{projectId}/contractors
POST /api/v1/impact/{projectId}/analyze
GET  /api/v1/conflicts/{projectId}
GET  /api/v1/conflicts/{projectId}/trust
POST /api/v1/ai/{projectId}/chat
GET  /api/v1/ai/{projectId}/brief
POST /api/v1/simulation/{projectId}/impact
POST /api/v1/simulation/{projectId}/impact-graph
GET  /api/v1/decisions/{projectId}
```

## Environment Variables

Create `backend/.env`:
```
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=buildgraph
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

## Troubleshooting

### Ollama not responding
- Ensure `ollama serve` is running
- Check model: `ollama list` should show `qwen2.5:3b`
- Fallback: AI uses rule-based responses automatically

### MongoDB connection failed
- Verify MongoDB is running: `mongo --eval "db.stats()"`
- Check connection string in `.env`

### Frontend build errors
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 8GB RAM Systems
- Close unnecessary apps
- Use smaller model: `ollama pull qwen2.5:1.5b`
- Update `OLLAMA_MODEL` in `.env`

## Project Structure

```
BuildGraph AI/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routes
│   │   ├── models/        # Pydantic models
│   │   ├── services/      # Business logic (AI, Impact, Conflict, Docs)
│   │   └── core/          # Config, DB
│   ├── seed_data.py       # Demo data seeder
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context
│   │   ├── utils/         # API client
│   │   └── styles/        # Tailwind
│   └── package.json
└── README.md
```

## License

MIT — Built for hackathon demo purposes.
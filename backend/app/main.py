from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api import projects, graph, entities, impact, conflicts, ai, documents, decisions, simulation


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["projects"])
app.include_router(graph.router, prefix=f"{settings.API_V1_STR}/graph", tags=["graph"])
app.include_router(entities.router, prefix=f"{settings.API_V1_STR}/entities", tags=["entities"])
app.include_router(impact.router, prefix=f"{settings.API_V1_STR}/impact", tags=["impact"])
app.include_router(conflicts.router, prefix=f"{settings.API_V1_STR}/conflicts", tags=["conflicts"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"])
app.include_router(decisions.router, prefix=f"{settings.API_V1_STR}/decisions", tags=["decisions"])
app.include_router(simulation.router, prefix=f"{settings.API_V1_STR}/simulation", tags=["simulation"])


@app.get("/")
async def root():
    return {"message": "BuildGraph AI API", "version": settings.VERSION}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

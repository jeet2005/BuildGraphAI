from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.services.conflict_engine import detect_conflicts, calculate_trust_scores
from app.models.responses import ConflictResult, TrustScore

router = APIRouter()


@router.get("/{project_id}", response_model=List[ConflictResult])
async def get_conflicts(
    project_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    conflicts = await detect_conflicts(db, ObjectId(project_id))
    return conflicts


@router.get("/{project_id}/trust", response_model=TrustScore)
async def get_trust_score(
    project_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    trust_data = await calculate_trust_scores(db, ObjectId(project_id))
    return trust_data


@router.get("/{project_id}/entity/{entity_id}/trust", response_model=Dict[str, Any])
async def get_entity_trust(
    project_id: str,
    entity_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id) or not ObjectId.is_valid(entity_id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    task = await db.tasks.find_one({"_id": ObjectId(entity_id), "project_id": ObjectId(project_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Entity not found")

    progress_sources = task.get("progress_sources", {})
    if len(progress_sources) < 2:
        return {
            "entity_id": entity_id,
            "entity_name": task["name"],
            "entity_type": "task",
            "trust_score": 100,
            "conflicts": [],
            "message": "Insufficient data sources for trust analysis"
        }

    values = list(progress_sources.values())
    max_val = max(values)
    min_val = min(values)
    difference = max_val - min_val
    trust_score = max(0, 100 - difference * 5)

    status = "conflict" if difference > 10 else "review" if difference > 5 else "normal"

    return {
        "entity_id": entity_id,
        "entity_name": task["name"],
        "entity_type": "task",
        "trust_score": trust_score,
        "sources": progress_sources,
        "max_difference": difference,
        "status": status,
        "recommendation": _generate_recommendation(task, progress_sources, difference, status)
    }


def _generate_recommendation(task: Dict[str, Any], sources: Dict[str, float], difference: float, status: str) -> str:
    if status == "conflict":
        return f"Significant discrepancy ({difference:.0f}%) between progress sources for {task['name']}. Verify actual site status before making decisions."
    elif status == "review":
        return f"Minor discrepancy ({difference:.0f}%) detected for {task['name']}. Recommend cross-checking with site team."
    return "Progress sources are aligned."
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.core.database import get_database
from app.models.schemas import Decision

router = APIRouter()


class DecisionCreate(BaseModel):
    title: str
    description: str
    reason: str
    decision_type: str
    people_involved: List[str] = []
    related_entities: List[Dict[str, Any]] = []
    date: str


@router.get("/{project_id}", response_model=List[Dict[str, Any]])
async def get_decisions(
    project_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    decisions = await db.decisions.find({"project_id": ObjectId(project_id)}).sort("date", -1).to_list(length=100)
    return decisions


@router.post("/{project_id}", response_model=Dict[str, Any])
async def create_decision(
    project_id: str,
    decision: DecisionCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    from datetime import datetime
    decision_dict = decision.model_dump()
    decision_dict["project_id"] = ObjectId(project_id)
    decision_dict["date"] = datetime.fromisoformat(decision_dict["date"])

    result = await db.decisions.insert_one(decision_dict)
    decision_dict["_id"] = result.inserted_id
    return decision_dict


@router.get("/{project_id}/search")
async def search_decisions(
    project_id: str,
    q: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    decisions = await db.decisions.find({
        "project_id": ObjectId(project_id),
        "$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"reason": {"$regex": q, "$options": "i"}}
        ]
    }).to_list(length=20)

    return decisions
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.core.database import get_database
from app.services.impact_engine import calculate_impact
from app.models.responses import ImpactResult

router = APIRouter()


class ImpactRequest(BaseModel):
    entity_id: str
    entity_type: str
    additional_delay: int = 0


@router.post("/{project_id}/analyze", response_model=ImpactResult)
async def analyze_impact(
    project_id: str,
    request: ImpactRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await calculate_impact(
        db,
        ObjectId(project_id),
        request.entity_id,
        request.entity_type,
        request.additional_delay
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.get("/{project_id}/material/{material_id}", response_model=ImpactResult)
async def get_material_impact(
    project_id: str,
    material_id: str,
    additional_delay: int = 0,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await calculate_impact(
        db,
        ObjectId(project_id),
        material_id,
        "material",
        additional_delay
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.get("/{project_id}/task/{task_id}", response_model=ImpactResult)
async def get_task_impact(
    project_id: str,
    task_id: str,
    additional_delay: int = 0,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await calculate_impact(
        db,
        ObjectId(project_id),
        task_id,
        "task",
        additional_delay
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result
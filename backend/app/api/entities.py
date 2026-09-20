from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.models.schemas import Task, Material, Contractor, Supplier, Relationship

router = APIRouter()


@router.get("/{project_id}/tasks", response_model=List[Dict[str, Any]])
async def get_tasks(
    project_id: str,
    status: Optional[str] = None,
    floor: Optional[str] = None,
    contractor_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    query = {"project_id": ObjectId(project_id)}
    if status:
        query["status"] = status
    if floor:
        query["floor"] = floor
    if contractor_id and ObjectId.is_valid(contractor_id):
        query["contractor_id"] = ObjectId(contractor_id)

    tasks = await db.tasks.find(query).to_list(length=500)
    return tasks


@router.get("/{project_id}/tasks/{task_id}", response_model=Dict[str, Any])
async def get_task(project_id: str, task_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(project_id) or not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "project_id": ObjectId(project_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/{project_id}/materials", response_model=List[Dict[str, Any]])
async def get_materials(project_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    materials = await db.materials.find({"project_id": ObjectId(project_id)}).to_list(length=500)
    return materials


@router.get("/{project_id}/materials/{material_id}", response_model=Dict[str, Any])
async def get_material(project_id: str, material_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(project_id) or not ObjectId.is_valid(material_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    material = await db.materials.find_one({"_id": ObjectId(material_id), "project_id": ObjectId(project_id)})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


@router.get("/{project_id}/contractors", response_model=List[Dict[str, Any]])
async def get_contractors(project_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    contractors = await db.contractors.find({"project_id": ObjectId(project_id)}).to_list(length=500)
    return contractors


@router.get("/{project_id}/contractors/{contractor_id}", response_model=Dict[str, Any])
async def get_contractor(project_id: str, contractor_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(project_id) or not ObjectId.is_valid(contractor_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    contractor = await db.contractors.find_one({"_id": ObjectId(contractor_id), "project_id": ObjectId(project_id)})
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return contractor


@router.get("/{project_id}/suppliers", response_model=List[Dict[str, Any]])
async def get_suppliers(project_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    suppliers = await db.suppliers.find({"project_id": ObjectId(project_id)}).to_list(length=500)
    return suppliers


@router.get("/{project_id}/relationships", response_model=List[Dict[str, Any]])
async def get_relationships(
    project_id: str,
    source_type: Optional[str] = None,
    target_type: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    query = {"project_id": ObjectId(project_id)}
    if source_type:
        query["source_type"] = source_type
    if target_type:
        query["target_type"] = target_type

    relationships = await db.relationships.find(query).to_list(length=1000)
    return relationships
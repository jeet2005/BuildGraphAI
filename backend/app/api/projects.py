from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.models.schemas import Project
from app.models.schemas import Project as ProjectResponse

router = APIRouter()


@router.get("", response_model=List[ProjectResponse])
async def get_projects(db: AsyncIOMotorDatabase = Depends(get_database)):
    projects = await db.projects.find().to_list(length=100)
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("", response_model=ProjectResponse)
async def create_project(project: Project, db: AsyncIOMotorDatabase = Depends(get_database)):
    project_dict = project.model_dump(by_alias=True, exclude={"id"})
    result = await db.projects.insert_one(project_dict)
    project_dict["_id"] = result.inserted_id
    return project_dict


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: Project, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    project_dict = project.model_dump(by_alias=True, exclude={"id", "created_at"})
    project_dict["updated_at"] = __import__("datetime").datetime.utcnow()
    result = await db.projects.find_one_and_update(
        {"_id": ObjectId(project_id)},
        {"$set": project_dict},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


@router.delete("/{project_id}")
async def delete_project(project_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    result = await db.projects.delete_one({"_id": ObjectId(project_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}

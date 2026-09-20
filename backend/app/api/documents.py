from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
import shutil

from app.core.database import get_database
from app.services.document_service import process_document, rebuild_search_index
from app.models.schemas import Document

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/{project_id}", response_model=List[Dict[str, Any]])
async def get_documents(
    project_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    documents = await db.documents.find({"project_id": ObjectId(project_id)}).to_list(length=100)
    return documents


@router.post("/{project_id}/upload")
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    file_path = os.path.join(UPLOAD_DIR, f"{project_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    document = Document(
        project_id=ObjectId(project_id),
        name=file.filename,
        file_type=file.content_type or "application/octet-stream",
        file_path=file_path
    )

    doc_dict = document.model_dump(by_alias=True, exclude={"id"})
    result = await db.documents.insert_one(doc_dict)
    doc_dict["_id"] = result.inserted_id

    await process_document(db, ObjectId(project_id), result.inserted_id, file_path)

    return doc_dict


@router.post("/{project_id}/rebuild-index")
async def rebuild_index(
    project_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    count = await rebuild_search_index(db, ObjectId(project_id))
    return {"message": f"Search index rebuilt with {count} chunks"}


@router.delete("/{project_id}/{document_id}")
async def delete_document(
    project_id: str,
    document_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id) or not ObjectId.is_valid(document_id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    doc = await db.documents.find_one({"_id": ObjectId(document_id), "project_id": ObjectId(project_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if os.path.exists(doc["file_path"]):
        os.remove(doc["file_path"])

    await db.documents.delete_one({"_id": ObjectId(document_id)})
    await rebuild_search_index(db, ObjectId(project_id))

    return {"message": "Document deleted"}
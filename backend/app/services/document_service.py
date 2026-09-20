import fitz
import logging
from typing import List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)


CHUNK_SIZE = 500
CHUNK_OVERLAP = 100


async def process_document(
    db: AsyncIOMotorDatabase,
    project_id: ObjectId,
    document_id: ObjectId,
    file_path: str
) -> List[Dict[str, Any]]:
    try:
        doc = fitz.open(file_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        doc.close()

        chunks = _chunk_text(full_text)

        chunk_data = []
        for i, chunk in enumerate(chunks):
            chunk_data.append({
                "index": i,
                "text": chunk,
                "metadata": {"page": i // 3 + 1}
            })

        await db.documents.update_one(
            {"_id": document_id},
            {"$set": {"content": full_text, "chunks": chunk_data}}
        )

        all_docs = await db.documents.find({"project_id": project_id, "chunks": {"$ne": []}}).to_list(length=100)
        all_chunks = []
        for d in all_docs:
            for chunk in d.get("chunks", []):
                chunk["document_id"] = str(d["_id"])
                chunk["document_name"] = d["name"]
                all_chunks.append(chunk)

        ai_service.build_faiss_index(all_chunks)

        return chunk_data

    except Exception as e:
        logger.error(f"Document processing failed: {e}")
        return []


def _chunk_text(text: str) -> List[str]:
    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + CHUNK_SIZE
        if end >= text_length:
            chunks.append(text[start:].strip())
            break

        chunk = text[start:end]
        last_period = chunk.rfind('.')
        last_newline = chunk.rfind('\n')
        split_point = max(last_period, last_newline)

        if split_point > start + CHUNK_SIZE // 2:
            end = split_point + 1

        chunks.append(text[start:end].strip())
        start = end - CHUNK_OVERLAP

    return [c for c in chunks if len(c.strip()) > 50]


async def rebuild_search_index(db: AsyncIOMotorDatabase, project_id: ObjectId):
    all_docs = await db.documents.find({"project_id": project_id, "chunks": {"$ne": []}}).to_list(length=100)
    all_chunks = []
    for d in all_docs:
        for chunk in d.get("chunks", []):
            chunk["document_id"] = str(d["_id"])
            chunk["document_name"] = d["name"]
            all_chunks.append(chunk)

    ai_service.build_faiss_index(all_chunks)
    return len(all_chunks)
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.core.database import get_database
from app.services.ai_service import ai_service
from app.models.responses import AIResponse, AIMessage

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    role: str = "project_manager"
    history: List[AIMessage] = []


@router.post("/{project_id}/chat", response_model=AIResponse)
async def chat_with_ai(
    project_id: str,
    request: ChatRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await ai_service.answer_question(
        db,
        ObjectId(project_id),
        request.question,
        request.role
    )

    return AIResponse(**result)


@router.get("/{project_id}/brief")
async def generate_project_brief(
    project_id: str,
    role: str = "management",
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = await db.tasks.find({"project_id": ObjectId(project_id)}).to_list(length=1000)
    total = len(tasks)
    completed = sum(1 for t in tasks if t["status"] == "completed")
    in_progress = sum(1 for t in tasks if t["status"] == "in_progress")
    delayed = sum(1 for t in tasks if t.get("delay_days", 0) > 0)

    progress_pct = (completed / total * 100) if total > 0 else 0
    schedule_variance = sum(t.get("delay_days", 0) for t in tasks)

    conflicts = await db.tasks.find({"project_id": ObjectId(project_id), "progress_sources.1": {"$exists": True}}).to_list(length=100)
    conflict_count = sum(1 for t in conflicts if max(t.get("progress_sources", {}).values()) - min(t.get("progress_sources", {}).values()) > 10)

    materials = await db.materials.find({"project_id": ObjectId(project_id)}).to_list(length=100)
    delayed_materials = [m for m in materials if m.get("delay_days", 0) > 0]

    top_risk = {"title": "No major risks", "impact": "Low"}
    if delayed_materials:
        top_risk = {
            "title": f"{delayed_materials[0]['name']} delivery delayed",
            "impact": "High",
            "cost_exposure": f"₹{sum(m.get('cost_per_unit', 0) * m.get('quantity_planned', 0) for m in delayed_materials) / 1e7:.1f} Cr"
        }

    trust_data = await db.tasks.find({"project_id": ObjectId(project_id), "progress_sources.1": {"$exists": True}}).to_list(length=100)
    trust_scores = []
    for t in trust_data:
        sources = t.get("progress_sources", {})
        if len(sources) >= 2:
            diff = max(sources.values()) - min(sources.values())
            trust_scores.append(max(0, 100 - diff * 5))
    data_trust = int(sum(trust_scores) / len(trust_scores)) if trust_scores else 100

    budget_utilization = 82

    prompt = f"""Generate a concise executive project brief for {project['name']}:
- Health: {int(progress_pct)}%
- Schedule variance: +{schedule_variance} days
- Budget utilization: {budget_utilization}%
- Data trust: {data_trust}%
- Top risk: {top_risk['title']}
- Delayed materials: {len(delayed_materials)}
- Conflicts: {conflict_count}

Write 3-4 sentences summarizing the situation and key actions needed."""

    ai_summary = await ai_service.generate_response(prompt, temperature=0.3)
    if not ai_summary:
        ai_summary = f"Project {project['name']} is at {progress_pct:.0f}% completion with {schedule_variance} days schedule variance. {len(delayed_materials)} materials delayed, {conflict_count} data conflicts detected. Immediate attention needed on {top_risk['title']}."

    return {
        "project_name": project["name"],
        "date": __import__("datetime").datetime.utcnow(),
        "health_score": int(progress_pct),
        "schedule_variance": schedule_variance,
        "budget_utilization": budget_utilization,
        "data_trust": data_trust,
        "top_risk": top_risk,
        "key_metrics": {
            "total_tasks": total,
            "completed": completed,
            "in_progress": in_progress,
            "delayed_tasks": delayed,
            "delayed_materials": len(delayed_materials)
        },
        "ai_summary": ai_summary
    }


@router.get("/{project_id}/status")
async def get_ai_status(
    project_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return {
        "ollama_available": ai_service.is_available(),
        "model": settings.OLLAMA_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
        "faiss_index_ready": ai_service.faiss_index is not None,
        "document_chunks": len(ai_service.document_chunks)
    }
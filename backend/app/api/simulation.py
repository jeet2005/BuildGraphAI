from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.core.database import get_database
from app.services.impact_engine import calculate_impact
from app.services.conflict_engine import detect_conflicts
from app.models.responses import ImpactResult, GraphData, GraphNode, GraphEdge

router = APIRouter()


class SimulationRequest(BaseModel):
    entity_id: str
    entity_type: str
    new_delay_days: int


@router.post("/{project_id}/impact", response_model=ImpactResult)
async def simulate_impact(
    project_id: str,
    request: SimulationRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = await calculate_impact(
        db,
        ObjectId(project_id),
        request.entity_id,
        request.entity_type,
        request.new_delay_days
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.post("/{project_id}/impact-graph", response_model=GraphData)
async def get_impact_graph(
    project_id: str,
    request: SimulationRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    impact_result = await calculate_impact(
        db,
        ObjectId(project_id),
        request.entity_id,
        request.entity_type,
        request.new_delay_days
    )

    if "error" in impact_result:
        raise HTTPException(status_code=404, detail=impact_result["error"])

    affected_ids = set([request.entity_id])
    for task in impact_result.get("affected_tasks", []):
        affected_ids.add(task["id"])

    project_oid = ObjectId(project_id)
    relationships = await db.relationships.find({"project_id": project_oid}).to_list(length=1000)
    tasks = await db.tasks.find({"project_id": project_oid}).to_list(length=1000)
    materials = await db.materials.find({"project_id": project_oid}).to_list(length=1000)
    contractors = await db.contractors.find({"project_id": project_oid}).to_list(length=1000)
    suppliers = await db.suppliers.find({"project_id": project_oid}).to_list(length=1000)

    nodes = []
    edges = []
    node_ids = set()

    def add_node(entity: dict, etype: str, label_field: str = "name"):
        eid = str(entity["_id"])
        if eid in node_ids:
            return
        node_ids.add(eid)
        is_affected = eid in affected_ids
        nodes.append(GraphNode(
            id=eid,
            type=etype,
            label=entity.get(label_field, eid),
            data=entity,
            style=get_node_style(etype, entity, is_affected)
        ))

    def get_node_style(etype: str, entity: dict, affected: bool) -> Dict[str, Any]:
        styles = {
            "project": {"background": "#1e3a8a", "color": "white", "border": "2px solid #3b82f6"},
            "building": {"background": "#1e40af", "color": "white", "border": "2px solid #60a5fa"},
            "floor": {"background": "#1e40af", "color": "white", "border": "2px solid #60a5fa"},
            "task": {"background": "#065f46", "color": "white", "border": "2px solid #10b981"},
            "material": {"background": "#92400e", "color": "white", "border": "2px solid #f59e0b"},
            "contractor": {"background": "#7c2d12", "color": "white", "border": "2px solid #ef4444"},
            "supplier": {"background": "#581c87", "color": "white", "border": "2px solid #a855f7"},
            "milestone": {"background": "#831843", "color": "white", "border": "2px solid #ec4899"},
        }
        base = styles.get(etype, {"background": "#374151", "color": "white", "border": "2px solid #9ca3af"})

        if affected:
            base["border"] = "4px solid #22d3ee"
            base["boxShadow"] = "0 0 20px #22d3ee"
            base["background"] = "#0e7490"

        if entity.get("delay_days", 0) > 0 and not affected:
            base["border"] = "3px solid #ef4444"
            base["boxShadow"] = "0 0 10px #ef4444"

        return base

    project = await db.projects.find_one({"_id": project_oid})
    if project:
        add_node(project, "project")

    for task in tasks:
        add_node(task, "task")

    for material in materials:
        add_node(material, "material")

    for contractor in contractors:
        add_node(contractor, "contractor")

    for supplier in suppliers:
        add_node(supplier, "supplier")

    for rel in relationships:
        source_id = str(rel["source_id"])
        target_id = str(rel["target_id"])
        if source_id in node_ids and target_id in node_ids:
            is_highlighted = source_id in affected_ids and target_id in affected_ids
            edges.append(GraphEdge(
                id=f"{source_id}-{target_id}-{rel['relationship_type']}",
                source=source_id,
                target=target_id,
                type="smoothstep",
                label=rel["relationship_type"],
                style={
                    "strokeWidth": 3 if is_highlighted else 2,
                    "stroke": "#22d3ee" if is_highlighted else "#9ca3af"
                }
            ))

    return GraphData(nodes=nodes, edges=edges)


@router.get("/{project_id}/scenarios")
async def get_scenarios(
    project_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    materials = await db.materials.find({
        "project_id": ObjectId(project_id),
        "delay_days": {"$gt": 0}
    }).to_list(length=20)

    tasks = await db.tasks.find({
        "project_id": ObjectId(project_id),
        "delay_days": {"$gt": 0}
    }).to_list(length=20)

    scenarios = []
    for m in materials:
        scenarios.append({
            "id": str(m["_id"]),
            "name": m["name"],
            "type": "material",
            "current_delay": m.get("delay_days", 0),
            "suggested_delays": [m.get("delay_days", 0) + 3, m.get("delay_days", 0) + 5, m.get("delay_days", 0) + 7]
        })

    for t in tasks:
        scenarios.append({
            "id": str(t["_id"]),
            "name": t["name"],
            "type": "task",
            "current_delay": t.get("delay_days", 0),
            "suggested_delays": [t.get("delay_days", 0) + 3, t.get("delay_days", 0) + 5, t.get("delay_days", 0) + 7]
        })

    return {"scenarios": scenarios}
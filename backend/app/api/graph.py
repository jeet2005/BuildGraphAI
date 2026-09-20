from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.models.responses import GraphData, GraphNode, GraphEdge

router = APIRouter()


@router.get("/{project_id}", response_model=GraphData)
async def get_project_graph(
    project_id: str,
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    depth: int = Query(2),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

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
        nodes.append(GraphNode(
            id=eid,
            type=etype,
            label=entity.get(label_field, eid),
            data=entity,
            style=get_node_style(etype, entity)
        ))

    def get_node_style(etype: str, entity: dict) -> Dict[str, Any]:
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
        
        if entity.get("delay_days", 0) > 0:
            base["border"] = "3px solid #ef4444"
            base["boxShadow"] = "0 0 10px #ef4444"
        if entity.get("status") == "conflict":
            base["border"] = "3px solid #f59e0b"
            base["boxShadow"] = "0 0 10px #f59e0b"
        
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
            edges.append(GraphEdge(
                id=f"{source_id}-{target_id}-{rel['relationship_type']}",
                source=source_id,
                target=target_id,
                type="smoothstep",
                label=rel["relationship_type"],
                style={"strokeWidth": 2}
            ))

    if entity_id and entity_id in node_ids:
        highlighted = get_connected_nodes(entity_id, relationships, depth)
        for node in nodes:
            if node.id in highlighted:
                node.style["border"] = "3px solid #22d3ee"
                node.style["boxShadow"] = "0 0 15px #22d3ee"

    return GraphData(nodes=nodes, edges=edges)


def get_connected_nodes(entity_id: str, relationships: List[dict], depth: int) -> set:
    connected = {entity_id}
    current_level = {entity_id}

    for _ in range(depth):
        next_level = set()
        for rel in relationships:
            src = str(rel["source_id"])
            tgt = str(rel["target_id"])
            if src in current_level:
                next_level.add(tgt)
            if tgt in current_level:
                next_level.add(src)
        connected.update(next_level)
        current_level = next_level

    return connected


@router.get("/{project_id}/highlight/{entity_id}")
async def get_highlighted_graph(
    project_id: str,
    entity_id: str,
    depth: int = Query(2),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await get_project_graph(project_id, entity_id=entity_id, depth=depth, db=db)
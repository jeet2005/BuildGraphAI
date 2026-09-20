from typing import List, Dict, Any, Set
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from collections import deque


async def calculate_impact(
    db: AsyncIOMotorDatabase,
    project_id: ObjectId,
    entity_id: str,
    entity_type: str,
    additional_delay: int = 0
) -> Dict[str, Any]:
    if entity_type == "material":
        return await _calculate_material_impact(db, project_id, entity_id, additional_delay)
    elif entity_type == "task":
        return await _calculate_task_impact(db, project_id, entity_id, additional_delay)
    else:
        return {"error": f"Unsupported entity type: {entity_type}"}


async def _calculate_material_impact(
    db: AsyncIOMotorDatabase,
    project_id: ObjectId,
    material_id: str,
    additional_delay: int
) -> Dict[str, Any]:
    material = await db.materials.find_one({"_id": ObjectId(material_id), "project_id": project_id})
    if not material:
        return {"error": "Material not found"}

    current_delay = material.get("delay_days", 0)
    total_delay = current_delay + additional_delay

    tasks_cursor = db.tasks.find({
        "project_id": project_id,
        "material_ids": ObjectId(material_id)
    })
    affected_tasks = await tasks_cursor.to_list(length=100)

    contractor_ids = set()
    milestone_ids = set()
    all_affected_task_ids = set()

    for task in affected_tasks:
        all_affected_task_ids.add(str(task["_id"]))
        if task.get("contractor_id"):
            contractor_ids.add(str(task["contractor_id"]))
        if task.get("milestone_id"):
            milestone_ids.add(str(task["milestone_id"]))

    downstream_tasks = await _get_downstream_tasks(db, project_id, all_affected_task_ids)
    for task in downstream_tasks:
        all_affected_task_ids.add(str(task["_id"]))
        if task.get("contractor_id"):
            contractor_ids.add(str(task["contractor_id"]))
        if task.get("milestone_id"):
            milestone_ids.add(str(task["milestone_id"]))

    contractors = []
    for cid in contractor_ids:
        if ObjectId.is_valid(cid):
            contractor = await db.contractors.find_one({"_id": ObjectId(cid)})
            if contractor:
                contractors.append({
                    "id": str(contractor["_id"]),
                    "name": contractor["name"],
                    "company": contractor["company"]
                })

    milestones = []
    for mid in milestone_ids:
        if ObjectId.is_valid(mid):
            milestone = await db.tasks.find_one({"_id": ObjectId(mid)})
            if milestone:
                milestones.append({
                    "id": str(milestone["_id"]),
                    "name": milestone["name"]
                })

    affected_task_details = []
    for tid in all_affected_task_ids:
        if ObjectId.is_valid(tid):
            task = await db.tasks.find_one({"_id": ObjectId(tid)})
            if task:
                affected_task_details.append({
                    "id": str(task["_id"]),
                    "name": task["name"],
                    "status": task["status"],
                    "progress": task["progress"],
                    "delay_days": task.get("delay_days", 0),
                    "floor": task.get("floor"),
                    "building": task.get("building")
                })

    risk_level = _calculate_risk_level(len(affected_task_details), len(contractors), len(milestones), total_delay)

    path = await _get_impact_path(db, project_id, material_id, "material", all_affected_task_ids)

    return {
        "entity_id": material_id,
        "entity_name": material["name"],
        "entity_type": "material",
        "delay_days": total_delay,
        "affected_tasks": affected_task_details,
        "affected_contractors": contractors,
        "affected_milestones": milestones,
        "total_affected": len(affected_task_details),
        "risk_level": risk_level,
        "projected_delay": total_delay,
        "path": path
    }


async def _calculate_task_impact(
    db: AsyncIOMotorDatabase,
    project_id: ObjectId,
    task_id: str,
    additional_delay: int
) -> Dict[str, Any]:
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "project_id": project_id})
    if not task:
        return {"error": "Task not found"}

    current_delay = task.get("delay_days", 0)
    total_delay = current_delay + additional_delay

    all_affected_task_ids = {task_id}
    downstream_tasks = await _get_downstream_tasks(db, project_id, {task_id})
    for t in downstream_tasks:
        all_affected_task_ids.add(str(t["_id"]))

    contractor_ids = set()
    milestone_ids = set()

    for tid in all_affected_task_ids:
        if ObjectId.is_valid(tid):
            t = await db.tasks.find_one({"_id": ObjectId(tid)})
            if t:
                if t.get("contractor_id"):
                    contractor_ids.add(str(t["contractor_id"]))
                if t.get("milestone_id"):
                    milestone_ids.add(str(t["milestone_id"]))

    contractors = []
    for cid in contractor_ids:
        if ObjectId.is_valid(cid):
            contractor = await db.contractors.find_one({"_id": ObjectId(cid)})
            if contractor:
                contractors.append({
                    "id": str(contractor["_id"]),
                    "name": contractor["name"],
                    "company": contractor["company"]
                })

    milestones = []
    for mid in milestone_ids:
        if ObjectId.is_valid(mid):
            milestone = await db.tasks.find_one({"_id": ObjectId(mid)})
            if milestone:
                milestones.append({
                    "id": str(milestone["_id"]),
                    "name": milestone["name"]
                })

    affected_task_details = []
    for tid in all_affected_task_ids:
        if ObjectId.is_valid(tid):
            t = await db.tasks.find_one({"_id": ObjectId(tid)})
            if t:
                affected_task_details.append({
                    "id": str(t["_id"]),
                    "name": t["name"],
                    "status": t["status"],
                    "progress": t["progress"],
                    "delay_days": t.get("delay_days", 0),
                    "floor": t.get("floor"),
                    "building": t.get("building")
                })

    risk_level = _calculate_risk_level(len(affected_task_details), len(contractors), len(milestones), total_delay)

    path = await _get_impact_path(db, project_id, task_id, "task", all_affected_task_ids)

    return {
        "entity_id": task_id,
        "entity_name": task["name"],
        "entity_type": "task",
        "delay_days": total_delay,
        "affected_tasks": affected_task_details,
        "affected_contractors": contractors,
        "affected_milestones": milestones,
        "total_affected": len(affected_task_details),
        "risk_level": risk_level,
        "projected_delay": total_delay,
        "path": path
    }


async def _get_downstream_tasks(
    db: AsyncIOMotorDatabase,
    project_id: ObjectId,
    start_task_ids: Set[str]
) -> List[Dict[str, Any]]:
    visited = set(start_task_ids)
    queue = deque(start_task_ids)
    downstream = []

    while queue:
        current_id = queue.popleft()
        task = await db.tasks.find_one({"_id": ObjectId(current_id)})
        if not task:
            continue

        for dep_id in task.get("dependents", []):
            dep_str = str(dep_id)
            if dep_str not in visited:
                visited.add(dep_str)
                queue.append(dep_str)
                dep_task = await db.tasks.find_one({"_id": dep_id})
                if dep_task:
                    downstream.append(dep_task)

    return downstream


def _calculate_risk_level(task_count: int, contractor_count: int, milestone_count: int, delay: int) -> str:
    score = task_count * 2 + contractor_count * 3 + milestone_count * 5 + delay
    if score >= 20:
        return "CRITICAL"
    elif score >= 10:
        return "HIGH"
    elif score >= 5:
        return "MEDIUM"
    return "LOW"


async def _get_impact_path(
    db: AsyncIOMotorDatabase,
    project_id: ObjectId,
    entity_id: str,
    entity_type: str,
    affected_task_ids: Set[str]
) -> List[str]:
    path = [entity_id]
    return path
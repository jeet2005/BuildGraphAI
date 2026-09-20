from typing import List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


async def detect_conflicts(
    db: AsyncIOMotorDatabase,
    project_id: ObjectId
) -> List[Dict[str, Any]]:
    tasks = await db.tasks.find({"project_id": project_id}).to_list(length=1000)
    conflicts = []

    for task in tasks:
        progress_sources = task.get("progress_sources", {})
        if len(progress_sources) >= 2:
            values = list(progress_sources.values())
            max_val = max(values)
            min_val = min(values)
            difference = max_val - min_val

            if difference > 5:
                status = "conflict" if difference > 10 else "review"
                source_names = list(progress_sources.keys())
                max_source = max(progress_sources, key=progress_sources.get)
                min_source = min(progress_sources, key=progress_sources.get)

                conflicts.append({
                    "entity_id": str(task["_id"]),
                    "entity_name": task["name"],
                    "entity_type": "task",
                    "sources": progress_sources,
                    "max_difference": difference,
                    "status": status,
                    "recommendation": _generate_recommendation(task, progress_sources, difference, status)
                })

    return conflicts


def _generate_recommendation(task: Dict[str, Any], sources: Dict[str, float], difference: float, status: str) -> str:
    if status == "conflict":
        return f"Significant discrepancy ({difference:.0f}%) between progress sources for {task['name']}. Verify actual site status before making decisions."
    else:
        return f"Minor discrepancy ({difference:.0f}%) detected for {task['name']}. Recommend cross-checking with site team."


async def calculate_trust_scores(
    db: AsyncIOMotorDatabase,
    project_id: ObjectId
) -> Dict[str, Any]:
    conflicts = await detect_conflicts(db, project_id)

    tasks = await db.tasks.find({"project_id": project_id}).to_list(length=1000)

    entity_trust = {}
    for task in tasks:
        progress_sources = task.get("progress_sources", {})
        if len(progress_sources) >= 2:
            values = list(progress_sources.values())
            max_val = max(values)
            min_val = min(values)
            difference = max_val - min_val
            trust_score = max(0, 100 - difference * 5)
            entity_trust[str(task["_id"])] = {
                "entity_id": str(task["_id"]),
                "entity_name": task["name"],
                "entity_type": "task",
                "trust_score": trust_score,
                "conflicts": [c for c in conflicts if c["entity_id"] == str(task["_id"])]
            }
        else:
            entity_trust[str(task["_id"])] = {
                "entity_id": str(task["_id"]),
                "entity_name": task["name"],
                "entity_type": "task",
                "trust_score": 100,
                "conflicts": []
            }

    overall_conflicts = len([c for c in conflicts if c["status"] == "conflict"])
    overall_reviews = len([c for c in conflicts if c["status"] == "review"])

    if overall_conflicts > 0:
        overall_status = "critical"
    elif overall_reviews > 0:
        overall_status = "warning"
    else:
        overall_status = "healthy"

    avg_trust = sum(e["trust_score"] for e in entity_trust.values()) / len(entity_trust) if entity_trust else 100

    return {
        "project_id": str(project_id),
        "overall_trust_score": round(avg_trust, 1),
        "overall_status": overall_status,
        "total_conflicts": overall_conflicts,
        "total_reviews": overall_reviews,
        "entities": list(entity_trust.values()),
        "summary": _generate_trust_summary(overall_conflicts, overall_reviews, avg_trust)
    }


def _generate_trust_summary(conflicts: int, reviews: int, avg_trust: float) -> str:
    if conflicts > 0:
        return f"Data trust is compromised. {conflicts} critical conflicts and {reviews} items need review. Average trust score: {avg_trust:.0f}%"
    elif reviews > 0:
        return f"Data trust needs attention. {reviews} items have minor discrepancies. Average trust score: {avg_trust:.0f}%"
    else:
        return f"Data trust is healthy. All progress sources align. Average trust score: {avg_trust:.0f}%"
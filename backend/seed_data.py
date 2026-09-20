import asyncio
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

MONGODB_URL = settings.MONGODB_URL
DB_NAME = settings.MONGODB_DB_NAME


async def seed_data():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]

    await db.projects.delete_many({})
    await db.tasks.delete_many({})
    await db.materials.delete_many({})
    await db.contractors.delete_many({})
    await db.suppliers.delete_many({})
    await db.relationships.delete_many({})
    await db.events.delete_many({})
    await db.risks.delete_many({})
    await db.decisions.delete_many({})
    await db.documents.delete_many({})

    print("Cleared existing data")

    project_id = ObjectId()
    project = {
        "_id": project_id,
        "name": "Skyline Business Park",
        "description": "3-building commercial complex with 12 floors each",
        "value": 428000000,
        "location": "Mumbai, Maharashtra",
        "start_date": datetime(2026, 1, 15),
        "end_date": datetime(2027, 6, 30),
        "status": "active",
        "buildings": 3,
        "floors": 12,
        "contractors_count": 8,
        "materials_count": 25,
        "tasks_count": 50,
        "documents_count": 20,
        "reports_count": 30,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await db.projects.insert_one(project)
    print(f"Created project: {project['name']}")

    buildings = ["Building A", "Building B", "Building C"]
    floors = [f"Floor {i}" for i in range(1, 13)]

    building_ids = {}
    floor_ids = {}

    for b in buildings:
        bid = ObjectId()
        building_ids[b] = bid
        await db.tasks.insert_one({
            "_id": bid,
            "project_id": project_id,
            "name": b,
            "description": f"{b} - 12 story commercial building",
            "type": "building",
            "status": "in_progress",
            "progress": 45.0,
            "progress_sources": {"Schedule": 48, "Site Report": 42, "Contractor": 52},
            "building": b,
            "delay_days": 0,
            "dependencies": [],
            "dependents": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })

    for b in buildings:
        for f in floors:
            fid = ObjectId()
            floor_ids[f"{b}-{f}"] = fid
            await db.tasks.insert_one({
                "_id": fid,
                "project_id": project_id,
                "name": f"{b} - {f}",
                "description": f"{f} of {b}",
                "type": "floor",
                "status": "in_progress" if f in ["Floor 1", "Floor 2", "Floor 3", "Floor 4"] else "pending",
                "progress": 60.0 if f in ["Floor 1", "Floor 2", "Floor 3"] else (35.0 if f == "Floor 4" else 0.0),
                "progress_sources": {"Schedule": 65, "Site Report": 55, "Contractor": 72} if f == "Floor 4" else {"Schedule": 60, "Site Report": 58, "Contractor": 62},
                "floor": f,
                "building": b,
                "delay_days": 5 if f == "Floor 4" else 0,
                "dependencies": [building_ids[b]],
                "dependents": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })

    for b in buildings:
        bid = building_ids[b]
        floor_list = [floor_ids[f"{b}-{f}"] for f in floors]
        await db.tasks.update_one(
            {"_id": bid},
            {"$set": {"dependents": floor_list}}
        )
        for fid in floor_list:
            await db.tasks.update_one(
                {"_id": fid},
                {"$set": {"dependencies": [bid]}}
            )

    task_templates = [
        {"name": "Structural Work", "type": "task", "floor": "Floor 4", "progress": 30, "delay": 5, "material": "ST-104"},
        {"name": "Electrical Installation", "type": "task", "floor": "Floor 4", "progress": 0, "delay": 0, "material": "EL-201"},
        {"name": "HVAC Installation", "type": "task", "floor": "Floor 4", "progress": 0, "delay": 0, "material": "HV-301"},
        {"name": "Plumbing", "type": "task", "floor": "Floor 4", "progress": 15, "delay": 0, "material": "PL-401"},
        {"name": "Fire Protection", "type": "task", "floor": "Floor 4", "progress": 0, "delay": 0, "material": "FP-501"},
        {"name": "Structural Work", "type": "task", "floor": "Floor 5", "progress": 10, "delay": 0, "material": "ST-104"},
        {"name": "Structural Work", "type": "task", "floor": "Floor 6", "progress": 0, "delay": 0, "material": "ST-104"},
    ]

    task_ids = {}
    for b in buildings:
        for tmpl in task_templates:
            if tmpl["floor"] in ["Floor 4", "Floor 5", "Floor 6"]:
                fid = floor_ids[f"{b}-{tmpl['floor']}"]
                tid = ObjectId()
                task_key = f"{b}-{tmpl['floor']}-{tmpl['name']}"
                task_ids[task_key] = tid

                sources = {"Schedule": tmpl["progress"] + 5, "Site Report": tmpl["progress"] - 5, "Contractor": tmpl["progress"] + 10}
                if task_key == "Building A-Floor 4-Structural Work":
                    sources = {"Schedule": 35, "Site Report": 20, "Contractor": 45}

                await db.tasks.insert_one({
                    "_id": tid,
                    "project_id": project_id,
                    "name": f"{b} - {tmpl['floor']} - {tmpl['name']}",
                    "description": f"{tmpl['name']} for {tmpl['floor']} of {b}",
                    "type": "task",
                    "status": "in_progress" if tmpl["progress"] > 0 else "pending",
                    "progress": tmpl["progress"],
                    "progress_sources": sources,
                    "floor": tmpl["floor"],
                    "building": b,
                    "delay_days": tmpl["delay"],
                    "material_ids": [],
                    "dependencies": [fid],
                    "dependents": [],
                    "contractor_id": None,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })

    for b in buildings:
        structural_4 = task_ids.get(f"{b}-Floor 4-Structural Work")
        electrical_4 = task_ids.get(f"{b}-Floor 4-Electrical Installation")
        hvac_4 = task_ids.get(f"{b}-Floor 4-HVAC Installation")
        plumbing_4 = task_ids.get(f"{b}-Floor 4-Plumbing")
        fire_4 = task_ids.get(f"{b}-Floor 4-Fire Protection")
        structural_5 = task_ids.get(f"{b}-Floor 5-Structural Work")
        structural_6 = task_ids.get(f"{b}-Floor 6-Structural Work")

        if structural_4:
            await db.tasks.update_one(
                {"_id": structural_4},
                {"$set": {"dependents": [electrical_4, hvac_4, plumbing_4, fire_4, structural_5]}}
            )
        if structural_5:
            await db.tasks.update_one(
                {"_id": structural_5},
                {"$set": {"dependencies": [structural_4], "dependents": [structural_6]}}
            )
        if structural_6:
            await db.tasks.update_one(
                {"_id": structural_6},
                {"$set": {"dependencies": [structural_5]}}
            )
        for dep_id in [electrical_4, hvac_4, plumbing_4, fire_4]:
            if dep_id:
                await db.tasks.update_one(
                    {"_id": dep_id},
                    {"$set": {"dependencies": [structural_4]}}
                )

    materials_data = [
        {"code": "ST-104", "name": "Structural Steel (Grade 350)", "category": "Steel", "unit": "MT", "qty": 2500, "delivered": 1200, "delay": 5, "supplier": "SteelCorp India", "cost": 75000},
        {"code": "EL-201", "name": "Electrical Conduits & Cable Trays", "category": "Electrical", "unit": "M", "qty": 15000, "delivered": 8000, "delay": 0, "supplier": "PowerTech Supplies", "cost": 450},
        {"code": "HV-301", "name": "HVAC Ducting & Units", "category": "HVAC", "unit": "Set", "qty": 36, "delivered": 12, "delay": 0, "supplier": "ClimateControl Ltd", "cost": 280000},
        {"code": "PL-401", "name": "Plumbing Pipes & Fittings", "category": "Plumbing", "unit": "M", "qty": 20000, "delivered": 15000, "delay": 0, "supplier": "FlowMaster Pipes", "cost": 320},
        {"code": "FP-501", "name": "Fire Protection Systems", "category": "Fire Safety", "unit": "Set", "qty": 108, "delivered": 0, "delay": 0, "supplier": "SafeGuard Systems", "cost": 95000},
        {"code": "CN-601", "name": "Ready Mix Concrete (M30)", "category": "Concrete", "unit": "CUM", "qty": 45000, "delivered": 32000, "delay": 0, "supplier": "ConcretePlus", "cost": 4200},
        {"code": "AL-701", "name": "Aluminum Curtain Wall", "category": "Facade", "unit": "SQM", "qty": 18000, "delivered": 6000, "delay": 2, "supplier": "GlassTech Facades", "cost": 8500},
    ]

    material_ids = {}
    for m in materials_data:
        mid = ObjectId()
        material_ids[m["code"]] = mid
        await db.materials.insert_one({
            "_id": mid,
            "project_id": project_id,
            "name": m["name"],
            "code": m["code"],
            "category": m["category"],
            "unit": m["unit"],
            "quantity_planned": m["qty"],
            "quantity_delivered": m["delivered"],
            "quantity_consumed": m["delivered"] * 0.8,
            "supplier_id": None,
            "status": "delayed" if m["delay"] > 0 else "partial",
            "delivery_date": datetime(2026, 9, 15),
            "actual_delivery": datetime(2026, 9, 20) if m["delay"] > 0 else None,
            "delay_days": m["delay"],
            "cost_per_unit": m["cost"],
            "specifications": f"Grade A, IS certified",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })

    for b in buildings:
        structural_4 = task_ids.get(f"{b}-Floor 4-Structural Work")
        structural_5 = task_ids.get(f"{b}-Floor 5-Structural Work")
        structural_6 = task_ids.get(f"{b}-Floor 6-Structural Work")
        electrical_4 = task_ids.get(f"{b}-Floor 4-Electrical Installation")
        hvac_4 = task_ids.get(f"{b}-Floor 4-HVAC Installation")
        plumbing_4 = task_ids.get(f"{b}-Floor 4-Plumbing")
        fire_4 = task_ids.get(f"{b}-Floor 4-Fire Protection")

        if structural_4:
            await db.tasks.update_one(
                {"_id": structural_4},
                {"$set": {"material_ids": [material_ids["ST-104"]]}}
            )
        if structural_5:
            await db.tasks.update_one(
                {"_id": structural_5},
                {"$set": {"material_ids": [material_ids["ST-104"]]}}
            )
        if structural_6:
            await db.tasks.update_one(
                {"_id": structural_6},
                {"$set": {"material_ids": [material_ids["ST-104"]]}}
            )
        if electrical_4:
            await db.tasks.update_one(
                {"_id": electrical_4},
                {"$set": {"material_ids": [material_ids["EL-201"]]}}
            )
        if hvac_4:
            await db.tasks.update_one(
                {"_id": hvac_4},
                {"$set": {"material_ids": [material_ids["HV-301"]]}}
            )
        if plumbing_4:
            await db.tasks.update_one(
                {"_id": plumbing_4},
                {"$set": {"material_ids": [material_ids["PL-401"]]}}
            )
        if fire_4:
            await db.tasks.update_one(
                {"_id": fire_4},
                {"$set": {"material_ids": [material_ids["FP-501"]]}}
            )

    contractors_data = [
        {"name": "Rajesh Kumar", "company": "Kumar Structural Works", "email": "rajesh@kumarstructural.com", "phone": "+91-98765-43210", "spec": ["Structural", "Concrete"], "tasks": ["Structural Work"]},
        {"name": "Priya Sharma", "company": "Sharma Electricals", "email": "priya@sharmaelectrical.com", "phone": "+91-98765-43211", "spec": ["Electrical"], "tasks": ["Electrical Installation"]},
        {"name": "Amit Patel", "company": "Patel HVAC Solutions", "email": "amit@patelhvac.com", "phone": "+91-98765-43212", "spec": ["HVAC"], "tasks": ["HVAC Installation"]},
        {"name": "Sunita Reddy", "company": "Reddy Plumbing Co", "email": "sunita@reddyplumbing.com", "phone": "+91-98765-43213", "spec": ["Plumbing"], "tasks": ["Plumbing"]},
        {"name": "Vikram Singh", "company": "Singh Fire Safety", "email": "vikram@singhfiresafety.com", "phone": "+91-98765-43214", "spec": ["Fire Protection"], "tasks": ["Fire Protection"]},
        {"name": "Deepak Joshi", "company": "Joshi Facades", "email": "deepak@joshifacades.com", "phone": "+91-98765-43215", "spec": ["Facade", "Curtain Wall"], "tasks": []},
        {"name": "Meera Nair", "company": "Nair Interiors", "email": "meera@nairinteriors.com", "phone": "+91-98765-43216", "spec": ["Interiors", "Finishing"], "tasks": []},
        {"name": "Arjun Gupta", "company": "Gupta Civil Contractors", "email": "arjun@guptacivil.com", "phone": "+91-98765-43217", "spec": ["Civil", "Excavation"], "tasks": []},
    ]

    contractor_ids = {}
    for c in contractors_data:
        cid = ObjectId()
        contractor_ids[c["name"]] = cid
        task_refs = []
        for b in buildings:
            for tmpl in task_templates:
                if tmpl["name"] in c["tasks"]:
                    task_key = f"{b}-{tmpl['floor']}-{tmpl['name']}"
                    if task_key in task_ids:
                        task_refs.append(task_ids[task_key])

        await db.contractors.insert_one({
            "_id": cid,
            "project_id": project_id,
            "name": c["name"],
            "company": c["company"],
            "contact_person": c["name"],
            "email": c["email"],
            "phone": c["phone"],
            "specialization": c["spec"],
            "assigned_tasks": task_refs,
            "status": "active",
            "rating": 4.5,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })

        for tid in task_refs:
            await db.tasks.update_one(
                {"_id": tid},
                {"$set": {"contractor_id": cid}}
            )

    suppliers_data = [
        {"name": "Ravi Steel", "company": "SteelCorp India", "email": "ravi@steelcorp.in", "phone": "+91-98765-43220", "materials": ["ST-104"]},
        {"name": "Suresh Power", "company": "PowerTech Supplies", "email": "suresh@powertech.in", "phone": "+91-98765-43221", "materials": ["EL-201"]},
        {"name": "Anil Climate", "company": "ClimateControl Ltd", "email": "anil@climatecontrol.in", "phone": "+91-98765-43222", "materials": ["HV-301"]},
        {"name": "Ramesh Flow", "company": "FlowMaster Pipes", "email": "ramesh@flowmaster.in", "phone": "+91-98765-43223", "materials": ["PL-401"]},
        {"name": "Kiran Safe", "company": "SafeGuard Systems", "email": "kiran@safeguard.in", "phone": "+91-98765-43224", "materials": ["FP-501"]},
        {"name": "Mohan Concrete", "company": "ConcretePlus", "email": "mohan@concreteplus.in", "phone": "+91-98765-43225", "materials": ["CN-601"]},
        {"name": "Preeti Glass", "company": "GlassTech Facades", "email": "preeti@glasstech.in", "phone": "+91-98765-43226", "materials": ["AL-701"]},
    ]

    supplier_ids = {}
    for s in suppliers_data:
        sid = ObjectId()
        supplier_ids[s["company"]] = sid
        material_refs = [material_ids[code] for code in s["materials"] if code in material_ids]

        await db.suppliers.insert_one({
            "_id": sid,
            "project_id": project_id,
            "name": s["name"],
            "company": s["company"],
            "contact_person": s["name"],
            "email": s["email"],
            "phone": s["phone"],
            "materials_supplied": material_refs,
            "status": "active",
            "rating": 4.2,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })

        for mid in material_refs:
            await db.materials.update_one(
                {"_id": mid},
                {"$set": {"supplier_id": sid}}
            )

    relationships = []

    for b in buildings:
        relationships.append({
            "project_id": project_id,
            "source_type": "project",
            "source_id": project_id,
            "target_type": "building",
            "target_id": building_ids[b],
            "relationship_type": "contains",
            "metadata": {},
            "created_at": datetime.utcnow()
        })

        for f in floors:
            fid = floor_ids[f"{b}-{f}"]
            relationships.append({
                "project_id": project_id,
                "source_type": "building",
                "source_id": building_ids[b],
                "target_type": "floor",
                "target_id": fid,
                "relationship_type": "contains",
                "metadata": {},
                "created_at": datetime.utcnow()
            })

    for b in buildings:
        for tmpl in task_templates:
            if tmpl["floor"] in ["Floor 4", "Floor 5", "Floor 6"]:
                task_key = f"{b}-{tmpl['floor']}-{tmpl['name']}"
                if task_key in task_ids:
                    fid = floor_ids[f"{b}-{tmpl['floor']}"]
                    relationships.append({
                        "project_id": project_id,
                        "source_type": "floor",
                        "source_id": fid,
                        "target_type": "task",
                        "target_id": task_ids[task_key],
                        "relationship_type": "contains",
                        "metadata": {},
                        "created_at": datetime.utcnow()
                    })

    for b in buildings:
        structural_4 = task_ids.get(f"{b}-Floor 4-Structural Work")
        electrical_4 = task_ids.get(f"{b}-Floor 4-Electrical Installation")
        hvac_4 = task_ids.get(f"{b}-Floor 4-HVAC Installation")
        plumbing_4 = task_ids.get(f"{b}-Floor 4-Plumbing")
        fire_4 = task_ids.get(f"{b}-Floor 4-Fire Protection")
        structural_5 = task_ids.get(f"{b}-Floor 5-Structural Work")
        structural_6 = task_ids.get(f"{b}-Floor 6-Structural Work")

        if structural_4 and electrical_4:
            relationships.append({"project_id": project_id, "source_type": "task", "source_id": structural_4, "target_type": "task", "target_id": electrical_4, "relationship_type": "blocks", "metadata": {}, "created_at": datetime.utcnow()})
        if structural_4 and hvac_4:
            relationships.append({"project_id": project_id, "source_type": "task", "source_id": structural_4, "target_type": "task", "target_id": hvac_4, "relationship_type": "blocks", "metadata": {}, "created_at": datetime.utcnow()})
        if structural_4 and plumbing_4:
            relationships.append({"project_id": project_id, "source_type": "task", "source_id": structural_4, "target_type": "task", "target_id": plumbing_4, "relationship_type": "blocks", "metadata": {}, "created_at": datetime.utcnow()})
        if structural_4 and fire_4:
            relationships.append({"project_id": project_id, "source_type": "task", "source_id": structural_4, "target_type": "task", "target_id": fire_4, "relationship_type": "blocks", "metadata": {}, "created_at": datetime.utcnow()})
        if structural_4 and structural_5:
            relationships.append({"project_id": project_id, "source_type": "task", "source_id": structural_4, "target_type": "task", "target_id": structural_5, "relationship_type": "precedes", "metadata": {}, "created_at": datetime.utcnow()})
        if structural_5 and structural_6:
            relationships.append({"project_id": project_id, "source_type": "task", "source_id": structural_5, "target_type": "task", "target_id": structural_6, "relationship_type": "precedes", "metadata": {}, "created_at": datetime.utcnow()})

    for m_code, mid in material_ids.items():
        for b in buildings:
            for tmpl in task_templates:
                if tmpl.get("material") == m_code:
                    task_key = f"{b}-{tmpl['floor']}-{tmpl['name']}"
                    if task_key in task_ids:
                        relationships.append({
                            "project_id": project_id,
                            "source_type": "material",
                            "source_id": mid,
                            "target_type": "task",
                            "target_id": task_ids[task_key],
                            "relationship_type": "required_for",
                            "metadata": {},
                            "created_at": datetime.utcnow()
                        })

    for c_name, cid in contractor_ids.items():
        contractor = await db.contractors.find_one({"_id": cid})
        if contractor:
            for tid in contractor.get("assigned_tasks", []):
                relationships.append({
                    "project_id": project_id,
                    "source_type": "contractor",
                    "source_id": cid,
                    "target_type": "task",
                    "target_id": tid,
                    "relationship_type": "assigned_to",
                    "metadata": {},
                    "created_at": datetime.utcnow()
                })

    for s_company, sid in supplier_ids.items():
        supplier = await db.suppliers.find_one({"_id": sid})
        if supplier:
            for mid in supplier.get("materials_supplied", []):
                relationships.append({
                    "project_id": project_id,
                    "source_type": "supplier",
                    "source_id": sid,
                    "target_type": "material",
                    "target_id": mid,
                    "relationship_type": "supplies",
                    "metadata": {},
                    "created_at": datetime.utcnow()
                })

    if relationships:
        await db.relationships.insert_many(relationships)
        print(f"Created {len(relationships)} relationships")

    events = [
        {"type": "delay", "title": "Steel Delivery Delayed", "description": "Structural steel ST-104 delivery delayed by 5 days due to supplier logistics issue", "entity_type": "material", "entity_id": material_ids["ST-104"], "severity": "high", "status": "open"},
        {"type": "conflict", "title": "Floor 4 Progress Discrepancy", "description": "Three progress sources show 15%+ difference for Floor 4 structural work", "entity_type": "task", "entity_id": task_ids.get("Building A-Floor 4-Structural Work"), "severity": "high", "status": "open"},
        {"type": "issue", "title": "Concrete Consumption Variance", "description": "Concrete consumption running 8% above planned quantity on Floors 1-3", "entity_type": "material", "entity_id": material_ids["CN-601"], "severity": "medium", "status": "open"},
    ]

    for e in events:
        e["project_id"] = project_id
        e["created_at"] = datetime.utcnow()
        e["updated_at"] = datetime.utcnow()
    await db.events.insert_many(events)

    risks = [
        {"title": "Steel Delivery Delay", "description": "ST-104 structural steel delayed 5 days, impacting Floor 4-6 structural work across all buildings", "category": "Schedule", "probability": "high", "impact": "high", "mitigation": "Expedite alternate supplier, resequence Floor 4 activities", "related_entities": [{"type": "material", "id": str(material_ids["ST-104"]), "name": "ST-104"}], "status": "active"},
        {"title": "Progress Data Reliability", "description": "Multiple progress sources disagree significantly on Floor 4", "category": "Data Quality", "probability": "high", "impact": "medium", "mitigation": "Conduct independent site verification", "related_entities": [{"type": "task", "id": str(task_ids.get("Building A-Floor 4-Structural Work")), "name": "Floor 4 Structural Work"}], "status": "active"},
        {"title": "Concrete Cost Overrun", "description": "8% higher concrete consumption may lead to budget overrun", "category": "Cost", "probability": "medium", "impact": "medium", "mitigation": "Audit consumption, negotiate rate with supplier", "related_entities": [{"type": "material", "id": str(material_ids["CN-601"]), "name": "CN-601"}], "status": "identified"},
    ]

    for r in risks:
        r["project_id"] = project_id
        r["owner"] = contractor_ids.get("Rajesh Kumar")
        r["created_at"] = datetime.utcnow()
        r["updated_at"] = datetime.utcnow()
    await db.risks.insert_many(risks)

    decisions = [
        {
            "project_id": project_id,
            "title": "Supplier B Selected for Structural Steel",
            "description": "Selected SteelCorp India (Supplier B) over SteelMax Ltd (Supplier A) for ST-104 structural steel",
            "reason": "Earlier delivery commitment (4 weeks vs 6 weeks) and better payment terms",
            "decision_type": "procurement",
            "people_involved": ["Project Manager", "Procurement Manager", "Structural Engineer"],
            "related_entities": [{"type": "material", "id": str(material_ids["ST-104"]), "name": "ST-104"}, {"type": "supplier", "id": str(supplier_ids["SteelCorp India"]), "name": "SteelCorp India"}],
            "date": datetime(2026, 8, 15),
            "created_at": datetime.utcnow()
        },
        {
            "project_id": project_id,
            "title": "Floor 4 Resequencing Approved",
            "description": "Approved resequencing of Floor 4 activities to start electrical rough-in before structural completion",
            "reason": "Mitigate steel delay impact by overlapping activities where safe",
            "decision_type": "schedule",
            "people_involved": ["Project Manager", "Site Engineer", "Electrical Contractor", "Structural Contractor"],
            "related_entities": [{"type": "task", "id": str(task_ids.get("Building A-Floor 4-Structural Work")), "name": "Floor 4 Structural Work"}, {"type": "task", "id": str(task_ids.get("Building A-Floor 4-Electrical Installation")), "name": "Floor 4 Electrical Installation"}],
            "date": datetime(2026, 9, 10),
            "created_at": datetime.utcnow()
        },
        {
            "project_id": project_id,
            "title": "Concrete Mix Design Change",
            "description": "Changed concrete mix from M30 to M35 for Floors 1-3 columns",
            "reason": "Higher strength requirement per revised structural design",
            "decision_type": "technical",
            "people_involved": ["Structural Engineer", "Project Manager", "Concrete Supplier"],
            "related_entities": [{"type": "material", "id": str(material_ids["CN-601"]), "name": "CN-601"}],
            "date": datetime(2026, 7, 20),
            "created_at": datetime.utcnow()
        }
    ]
    await db.decisions.insert_many(decisions)

    print("Seed data created successfully!")
    print(f"Project ID: {project_id}")
    print(f"Material ST-104 ID: {material_ids['ST-104']}")
    print(f"Task Floor 4 Structural Work (Building A): {task_ids.get('Building A-Floor 4-Structural Work')}")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_data())

import os
import json
import httpx
import logging
from typing import List, Dict, Any, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

import ollama
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self):
        self.ollama_client = None
        self.embedding_model = None
        self.faiss_index = None
        self.document_chunks = []
        self._initialize()

    def _initialize(self):
        try:
            self.ollama_client = ollama.Client(host=settings.OLLAMA_HOST)
            self.embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("AI Service initialized successfully")
        except Exception as e:
            logger.warning(f"AI Service initialization failed: {e}")

    def is_available(self) -> bool:
        try:
            if self.ollama_client:
                models = self.ollama_client.list()
                return any(m.get('name', '').startswith(settings.OLLAMA_MODEL.split(':')[0]) for m in models.get('models', []))
        except Exception:
            pass
        return False

    def get_embeddings(self, texts: List[str]) -> np.ndarray:
        if self.embedding_model:
            return self.embedding_model.encode(texts, convert_to_numpy=True)
        return np.array([])

    def build_faiss_index(self, chunks: List[Dict[str, Any]]):
        self.document_chunks = chunks
        if not chunks:
            self.faiss_index = None
            return

        texts = [chunk["text"] for chunk in chunks]
        embeddings = self.get_embeddings(texts)
        if embeddings.size > 0:
            dimension = embeddings.shape[1]
            self.faiss_index = faiss.IndexFlatL2(dimension)
            self.faiss_index.add(embeddings.astype('float32'))

    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not self.faiss_index or not self.document_chunks:
            return []

        query_embedding = self.get_embeddings([query])
        if query_embedding.size == 0:
            return []

        distances, indices = self.faiss_index.search(query_embedding.astype('float32'), top_k)
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.document_chunks):
                chunk = self.document_chunks[idx].copy()
                chunk["distance"] = float(distances[0][i])
                results.append(chunk)
        return results

    async def generate_response(
        self,
        prompt: str,
        system_prompt: str = "",
        context: str = "",
        temperature: float = 0.3
    ) -> str:
        if not self.is_available():
            return None

        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.append({"role": "system", "content": f"Context: {context}"})
            messages.append({"role": "user", "content": prompt})

            response = self.ollama_client.chat(
                model=settings.OLLAMA_MODEL,
                messages=messages,
                options={"temperature": temperature}
            )
            return response.get("message", {}).get("content", "")
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            return None

    async def classify_intent(self, question: str) -> Dict[str, Any]:
        system_prompt = """You are an AI assistant for a construction project management system. 
Classify the user's question into one of these intents:
- PROJECT_STATUS: General project health, progress, overview
- IMPACT_QUERY: What happens if X is delayed/changed
- CONFLICT_CHECK: Are there contradictions/discrepancies
- DECISION_MEMORY: Why was a decision made, who decided
- ROLE_GUIDANCE: What should I focus on, priorities for my role
- DOCUMENT_SEARCH: Find information in documents/reports
- GENERAL: Other questions

Also extract entities mentioned (material names, task names, floor numbers, contractor names, etc.)

Return JSON only:
{
  "intent": "INTENT_TYPE",
  "entities": [{"type": "material|task|floor|contractor|supplier", "name": "entity name"}],
  "parameters": {"delay_days": 5}
}"""

        response = await self.generate_response(question, system_prompt=system_prompt, temperature=0.1)
        if response:
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                pass

        return {"intent": "GENERAL", "entities": [], "parameters": {}}

    async def build_project_context(
        self,
        db: AsyncIOMotorDatabase,
        project_id: ObjectId,
        intent: str,
        entities: List[Dict[str, Any]]
    ) -> str:
        context_parts = []

        project = await db.projects.find_one({"_id": project_id})
        if project:
            context_parts.append(f"Project: {project['name']} (Value: ₹{project.get('value', 0)/1e7:.1f} Cr)")

        if intent == "PROJECT_STATUS":
            tasks = await db.tasks.find({"project_id": project_id}).to_list(length=100)
            completed = sum(1 for t in tasks if t["status"] == "completed")
            in_progress = sum(1 for t in tasks if t["status"] == "in_progress")
            delayed = sum(1 for t in tasks if t.get("delay_days", 0) > 0)
            context_parts.append(f"Tasks: {len(tasks)} total, {completed} completed, {in_progress} in progress, {delayed} delayed")

            conflicts = await db.tasks.find({"project_id": project_id, "progress_sources.1": {"$exists": True}}).to_list(length=100)
            conflict_count = sum(1 for t in conflicts if max(t.get("progress_sources", {}).values()) - min(t.get("progress_sources", {}).values()) > 10)
            if conflict_count:
                context_parts.append(f"Data conflicts: {conflict_count} tasks with significant progress discrepancies")

        elif intent == "IMPACT_QUERY":
            for entity in entities:
                if entity["type"] == "material":
                    materials = await db.materials.find({"project_id": project_id, "name": {"$regex": entity["name"], "$options": "i"}}).to_list(length=5)
                    for m in materials:
                        context_parts.append(f"Material: {m['name']} (Code: {m['code']}), Delay: {m.get('delay_days', 0)} days, Status: {m['status']}")
                elif entity["type"] == "task":
                    tasks = await db.tasks.find({"project_id": project_id, "name": {"$regex": entity["name"], "$options": "i"}}).to_list(length=5)
                    for t in tasks:
                        context_parts.append(f"Task: {t['name']}, Floor: {t.get('floor')}, Status: {t['status']}, Progress: {t['progress']}%, Delay: {t.get('delay_days', 0)} days")

        elif intent == "CONFLICT_CHECK":
            tasks = await db.tasks.find({"project_id": project_id, "progress_sources.1": {"$exists": True}}).to_list(length=100)
            for t in tasks:
                sources = t.get("progress_sources", {})
                if len(sources) >= 2:
                    diff = max(sources.values()) - min(sources.values())
                    if diff > 5:
                        context_parts.append(f"Conflict: {t['name']} - Sources: {sources}, Diff: {diff:.0f}%")

        elif intent == "DECISION_MEMORY":
            decisions = await db.decisions.find({"project_id": project_id}).to_list(length=20)
            for d in decisions:
                context_parts.append(f"Decision: {d['title']} - {d['reason']} (Date: {d['date'].strftime('%Y-%m-%d')}, People: {', '.join(d['people_involved'])})")

        elif intent == "ROLE_GUIDANCE":
            context_parts.append("Role-based guidance requested. Provide prioritized action items.")

        return "\n".join(context_parts)

    async def answer_question(
        self,
        db: AsyncIOMotorDatabase,
        project_id: ObjectId,
        question: str,
        role: str = "project_manager"
    ) -> Dict[str, Any]:
        intent_result = await self.classify_intent(question)
        intent = intent_result.get("intent", "GENERAL")
        entities = intent_result.get("entities", [])
        parameters = intent_result.get("parameters", {})

        context = await self.build_project_context(db, project_id, intent, entities)

        rag_context = ""
        if intent in ["DOCUMENT_SEARCH", "DECISION_MEMORY", "GENERAL"]:
            rag_results = self.search_documents(question, top_k=3)
            if rag_results:
                rag_context = "\n".join([r["text"][:500] for r in rag_context])

        system_prompt = self._get_system_prompt(role, intent)
        full_context = f"{context}\n\n{rag_context}".strip()

        answer = await self.generate_response(
            prompt=question,
            system_prompt=system_prompt,
            context=full_context,
            temperature=0.3
        )

        if answer is None:
            answer = await self._fallback_answer(db, project_id, intent, entities, parameters)

        graph_highlight = []
        for entity in entities:
            if entity["type"] in ["material", "task"]:
                results = await db[entity["type"] + "s"].find({
                    "project_id": project_id,
                    "name": {"$regex": entity["name"], "$options": "i"}
                }).to_list(length=5)
                for r in results:
                    graph_highlight.append(str(r["_id"]))

        return {
            "message": answer,
            "intent": intent,
            "entities": entities,
            "actions": self._get_suggested_actions(intent, entities),
            "graph_highlight": graph_highlight,
            "confidence": 0.9 if answer else 0.5
        }

    def _get_system_prompt(self, role: str, intent: str) -> str:
        role_prompts = {
            "project_manager": "You are an AI assistant for a Project Manager. Focus on schedule, cost, risks, contractor coordination, and decision-making. Be concise and actionable.",
            "site_engineer": "You are an AI assistant for a Site Engineer. Focus on site issues, material availability, activity progress, unresolved work, and immediate priorities. Be practical and specific.",
            "contractor": "You are an AI assistant for a Contractor. Focus on assigned tasks, blockers, dependencies, deadlines, and what's needed to proceed. Be direct and task-oriented.",
            "management": "You are an AI assistant for Management/Executives. Focus on project health, financial exposure, schedule variance, major risks, and strategic decisions. Be high-level and summary-oriented."
        }
        return role_prompts.get(role, role_prompts["project_manager"])

    def _get_suggested_actions(self, intent: str, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        actions = []
        if intent == "IMPACT_QUERY":
            actions.append({"type": "simulate_impact", "label": "Run Impact Simulation"})
            actions.append({"type": "show_graph", "label": "Show Impact Graph"})
        elif intent == "CONFLICT_CHECK":
            actions.append({"type": "view_trust", "label": "View Data Trust Dashboard"})
        elif intent == "DECISION_MEMORY":
            actions.append({"type": "view_decisions", "label": "View All Decisions"})
        elif intent == "ROLE_GUIDANCE":
            actions.append({"type": "view_dashboard", "label": "View My Dashboard"})
        return actions

    async def _fallback_answer(
        self,
        db: AsyncIOMotorDatabase,
        project_id: ObjectId,
        intent: str,
        entities: List[Dict[str, Any]],
        parameters: Dict[str, Any]
    ) -> str:
        if intent == "PROJECT_STATUS":
            return await self._fallback_project_status(db, project_id)
        elif intent == "IMPACT_QUERY":
            return await self._fallback_impact(db, project_id, entities, parameters)
        elif intent == "CONFLICT_CHECK":
            return await self._fallback_conflicts(db, project_id)
        elif intent == "DECISION_MEMORY":
            return await self._fallback_decisions(db, project_id, entities)
        elif intent == "ROLE_GUIDANCE":
            return await self._fallback_role_guidance(db, project_id)
        return "I'm unable to process your question at the moment. Please try again or check the dashboard for current project status."

    async def _fallback_project_status(self, db: AsyncIOMotorDatabase, project_id: ObjectId) -> str:
        tasks = await db.tasks.find({"project_id": project_id}).to_list(length=100)
        total = len(tasks)
        completed = sum(1 for t in tasks if t["status"] == "completed")
        in_progress = sum(1 for t in tasks if t["status"] == "in_progress")
        delayed = sum(1 for t in tasks if t.get("delay_days", 0) > 0)
        return f"Project has {total} tasks: {completed} completed, {in_progress} in progress, {delayed} delayed. Check the dashboard for detailed status."

    async def _fallback_impact(self, db: AsyncIOMotorDatabase, project_id: ObjectId, entities: List[Dict[str, Any]], parameters: Dict[str, Any]) -> str:
        delay = parameters.get("delay_days", 5)
        for entity in entities:
            if entity["type"] == "material":
                return f"If {entity['name']} is delayed by {delay} days, downstream tasks dependent on this material will be affected. Use the Impact Simulator for detailed analysis."
            elif entity["type"] == "task":
                return f"Delaying {entity['name']} by {delay} days will impact its dependent tasks and potentially the milestone. Use the Impact Simulator for detailed analysis."
        return "Specify a material or task to analyze impact."

    async def _fallback_conflicts(self, db: AsyncIOMotorDatabase, project_id: ObjectId) -> str:
        tasks = await db.tasks.find({"project_id": project_id, "progress_sources.1": {"$exists": True}}).to_list(length=100)
        conflicts = []
        for t in tasks:
            sources = t.get("progress_sources", {})
            if len(sources) >= 2:
                diff = max(sources.values()) - min(sources.values())
                if diff > 10:
                    conflicts.append(f"{t['name']}: {diff:.0f}% difference")
        if conflicts:
            return f"Found {len(conflicts)} significant progress conflicts:\n" + "\n".join(conflicts[:5])
        return "No significant progress conflicts detected."

    async def _fallback_decisions(self, db: AsyncIOMotorDatabase, project_id: ObjectId, entities: List[Dict[str, Any]]) -> str:
        decisions = await db.decisions.find({"project_id": project_id}).to_list(length=10)
        if not decisions:
            return "No decisions recorded for this project."
        for entity in entities:
            for d in decisions:
                if entity["name"].lower() in d["title"].lower() or entity["name"].lower() in d["reason"].lower():
                    return f"Decision: {d['title']}\nReason: {d['reason']}\nDate: {d['date'].strftime('%Y-%m-%d')}\nPeople: {', '.join(d['people_involved'])}"
        return "Recent decisions:\n" + "\n".join([f"- {d['title']}: {d['reason']}" for d in decisions[:3]])

    async def _fallback_role_guidance(self, db: AsyncIOMotorDatabase, project_id: ObjectId) -> str:
        tasks = await db.tasks.find({"project_id": project_id, "status": {"$in": ["pending", "in_progress"]}, "delay_days": {"$gt": 0}}).sort("delay_days", -1).to_list(length=5)
        if tasks:
            return "Priority items:\n" + "\n".join([f"- {t['name']} (Floor {t.get('floor', 'N/A')}): {t.get('delay_days', 0)} days delayed" for t in tasks])
        return "No urgent delayed tasks. Check dashboard for current priorities."


ai_service = AIService()
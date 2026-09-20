from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    data: Dict[str, Any] = {}
    position: Dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0})
    style: Dict[str, Any] = {}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str = "default"
    label: Optional[str] = None
    style: Dict[str, Any] = {}


class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class ImpactResult(BaseModel):
    entity_id: str
    entity_name: str
    entity_type: str
    delay_days: int
    affected_tasks: List[Dict[str, Any]]
    affected_contractors: List[Dict[str, Any]]
    affected_milestones: List[Dict[str, Any]]
    total_affected: int
    risk_level: str
    projected_delay: int
    path: List[str]


class ConflictResult(BaseModel):
    entity_id: str
    entity_name: str
    entity_type: str
    sources: Dict[str, float]
    max_difference: float
    status: str
    recommendation: str


class TrustScore(BaseModel):
    entity_id: str
    entity_name: str
    entity_type: str
    trust_score: float
    conflicts: List[ConflictResult]
    overall_status: str


class AIMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}


class AIResponse(BaseModel):
    message: str
    intent: Optional[str] = None
    entities: List[Dict[str, Any]] = []
    actions: List[Dict[str, Any]] = []
    graph_highlight: List[str] = []
    confidence: float = 1.0


class DashboardData(BaseModel):
    role: str
    user_name: str
    priority_items: List[Dict[str, Any]]
    recent_reports: List[Dict[str, Any]] = []
    activities: List[Dict[str, Any]] = []
    alerts: List[Dict[str, Any]] = []
    ai_recommendation: Optional[str] = None


class ProjectBrief(BaseModel):
    project_name: str
    date: datetime
    health_score: int
    schedule_variance: int
    budget_utilization: int
    data_trust: int
    top_risk: Dict[str, Any]
    key_metrics: Dict[str, Any]
    ai_summary: str


class SimulationInput(BaseModel):
    entity_id: str
    entity_type: str
    new_delay_days: int


class SimulationResult(BaseModel):
    input: SimulationInput
    impact: ImpactResult
    graph_highlight: List[str]
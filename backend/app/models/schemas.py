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


class Project(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    description: Optional[str] = None
    value: Optional[float] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str = "active"
    buildings: int = 0
    floors: int = 0
    contractors_count: int = 0
    materials_count: int = 0
    tasks_count: int = 0
    documents_count: int = 0
    reports_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Task(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    project_id: PyObjectId
    name: str
    description: Optional[str] = None
    type: str
    status: str = "pending"
    progress: float = 0.0
    progress_sources: Dict[str, float] = {}
    floor: Optional[str] = None
    building: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    delay_days: int = 0
    contractor_id: Optional[PyObjectId] = None
    material_ids: List[PyObjectId] = []
    dependencies: List[PyObjectId] = []
    dependents: List[PyObjectId] = []
    milestone_id: Optional[PyObjectId] = None
    priority: str = "medium"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Material(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    project_id: PyObjectId
    name: str
    code: str
    category: str
    unit: str
    quantity_planned: float
    quantity_delivered: float = 0.0
    quantity_consumed: float = 0.0
    supplier_id: Optional[PyObjectId] = None
    status: str = "pending"
    delivery_date: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    delay_days: int = 0
    cost_per_unit: Optional[float] = None
    specifications: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Contractor(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    project_id: PyObjectId
    name: str
    company: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    specialization: List[str] = []
    assigned_tasks: List[PyObjectId] = []
    status: str = "active"
    rating: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Supplier(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    project_id: PyObjectId
    name: str
    company: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    materials_supplied: List[PyObjectId] = []
    status: str = "active"
    rating: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Relationship(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    project_id: PyObjectId
    source_type: str
    source_id: PyObjectId
    target_type: str
    target_id: PyObjectId
    relationship_type: str
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Event(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    project_id: PyObjectId
    type: str
    title: str
    description: str
    entity_type: Optional[str] = None
    entity_id: Optional[PyObjectId] = None
    severity: str = "info"
    status: str = "open"
    assigned_to: Optional[PyObjectId] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Risk(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    project_id: PyObjectId
    title: str
    description: str
    category: str
    probability: str
    impact: str
    mitigation: Optional[str] = None
    owner: Optional[PyObjectId] = None
    status: str = "identified"
    related_entities: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Document(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    project_id: PyObjectId
    name: str
    file_type: str
    file_path: str
    content: Optional[str] = None
    chunks: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}
    uploaded_by: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Decision(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    project_id: PyObjectId
    title: str
    description: str
    reason: str
    decision_type: str
    people_involved: List[str] = []
    related_entities: List[Dict[str, Any]] = []
    date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class UserRole(BaseModel):
    role: str
    name: str
    avatar: Optional[str] = None
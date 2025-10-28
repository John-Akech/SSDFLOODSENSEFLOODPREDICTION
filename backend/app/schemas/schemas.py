from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    COMMUNITY_MEMBER = "community_member"
    NGO_PARTNER = "ngo_partner"
    ADMIN = "admin"


class Language(str, Enum):
    ENGLISH = "en"
    ARABIC = "ar"


class ModelType(str, Enum):
    RANDOM_FOREST = "rf"
    TCN = "tcn"
    ENSEMBLE = "ensemble"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.COMMUNITY_MEMBER
    language: Language = Language.ENGLISH
    contact_info: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    language: Optional[Language] = None
    contact_info: Optional[str] = None


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# Prediction schemas
class PredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    model_type: ModelType = ModelType.RANDOM_FOREST
    lead_time_hours: int = Field(default=12, ge=1, le=168)  # 1 hour to 1 week
    features: Optional[Dict[str, float]] = None
    
    model_config = {"protected_namespaces": ()}


class PredictionResponse(BaseModel):
    id: int
    latitude: float
    longitude: float
    flood_probability: float
    model_type: str
    lead_time_hours: int
    confidence_score: Optional[float]
    risk_level: str  # low, medium, high, critical
    created_at: datetime
    model_predictions: Optional[Dict[str, float]] = None  # Individual model predictions for ensemble
    
    model_config = {"from_attributes": True, "protected_namespaces": ()}


# Flood event schemas
class FloodEventCreate(BaseModel):
    date_time: datetime
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    severity: float = Field(..., ge=0, le=1)
    state: str
    location_name: Optional[str] = None


class FloodEvent(FloodEventCreate):
    id: int
    verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Recommendation schemas
class RecommendationCreate(BaseModel):
    prediction_id: int
    recommendation_type: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    description: str
    priority: Priority = Priority.MEDIUM
    estimated_cost: Optional[float] = None


class Recommendation(RecommendationCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Feedback schemas
class FeedbackCreate(BaseModel):
    prediction_id: Optional[int] = None
    feedback_type: str
    rating: int = Field(..., ge=1, le=5)
    comments: Optional[str] = None
    flood_occurred: Optional[bool] = None
    actual_severity: Optional[float] = Field(None, ge=0, le=1)


class Feedback(FeedbackCreate):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Alert schemas
class AlertCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    message: str
    severity: Priority = Priority.MEDIUM
    expires_at: Optional[datetime] = None


class Alert(BaseModel):
    id: str
    latitude: float
    longitude: float
    message: str
    severity: str
    created_at: datetime
    expires_at: Optional[datetime]


# GIS schemas
class DykePlacementRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    flood_probability: float = Field(..., ge=0, le=1)
    elevation: Optional[float] = None
    river_distance: Optional[float] = None


class DykePlacementResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    map_data: Dict[str, Any]


# Statistics schemas
class SystemStats(BaseModel):
    total_predictions: int
    total_users: int
    total_flood_events: int
    accuracy_metrics: Dict[str, float]
    model_performance: Dict[str, Dict[str, float]]
    
    model_config = {"protected_namespaces": ()}


# Batch prediction schemas
class BatchPredictionRequest(BaseModel):
    locations: List[Dict[str, float]]  # [{"lat": x, "lon": y}, ...]
    model_type: ModelType = ModelType.RANDOM_FOREST
    lead_time_hours: int = Field(default=12, ge=1, le=168)
    
    model_config = {"protected_namespaces": ()}


class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]
    summary: Dict[str, Any]
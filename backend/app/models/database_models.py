from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="community_member")  # community_member, ngo_partner, admin
    language = Column(String, default="en")
    contact_info = Column(Text, nullable=True)  # Encrypted with AES-256
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    predictions = relationship("Prediction", back_populates="user")
    feedback = relationship("Feedback", back_populates="user")


class FloodEvent(Base):
    __tablename__ = "flood_events"
    
    id = Column(Integer, primary_key=True, index=True)
    date_time = Column(DateTime, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    severity = Column(Float, nullable=False)  # 0-1 scale
    state = Column(String, nullable=False)
    location_name = Column(String, nullable=True)
    reported_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    predictions = relationship("Prediction", back_populates="flood_event")


class Prediction(Base):
    __tablename__ = "predictions"
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    flood_event_id = Column(Integer, ForeignKey("flood_events.id"), nullable=True, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    flood_probability = Column(Float, nullable=False, index=True)
    risk_level = Column(String, nullable=True, index=True)  # low, medium, high, critical
    model_type = Column(String, nullable=False, index=True)
    lead_time_hours = Column(Integer, nullable=False)
    confidence_score = Column(Float, nullable=True)
    features_used = Column(Text, nullable=True)
    inference_time_ms = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Admin moderation fields
    published = Column(Boolean, default=False)
    admin_notes = Column(Text, nullable=True)
    approved_by = Column(Integer, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected = Column(Boolean, default=False)
    rejection_reason = Column(Text, nullable=True)
    rejected_by = Column(Integer, nullable=True)
    retracted = Column(Boolean, default=False)
    retracted_by = Column(Integer, nullable=True)
    retracted_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="predictions", foreign_keys=[user_id])
    flood_event = relationship("FloodEvent", back_populates="predictions")
    recommendations = relationship("Recommendation", back_populates="prediction")


class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False, index=True)
    recommendation_type = Column(String, nullable=False, index=True)  # dyke_placement, evacuation, etc.
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    description = Column(Text, nullable=False)
    priority = Column(String, default="medium", index=True)  # low, medium, high, critical
    estimated_cost = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    prediction = relationship("Prediction", back_populates="recommendations")


class Feedback(Base):
    __tablename__ = "feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)
    feedback_type = Column(String, nullable=False)  # accuracy, usability, alert_timing
    rating = Column(Integer, nullable=False)  # 1-5 scale
    comments = Column(Text, nullable=True)
    flood_occurred = Column(Boolean, nullable=True)
    actual_severity = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="feedback")


class SARImage(Base):
    __tablename__ = "sar_images"
    
    id = Column(Integer, primary_key=True, index=True)
    acquisition_date = Column(DateTime, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    sar_before = Column(Float, nullable=False)
    sar_after = Column(Float, nullable=False)
    sar_difference = Column(Float, nullable=False)
    sar_change = Column(Float, nullable=False)
    resolution = Column(Float, default=10.0)  # meters
    processed_at = Column(DateTime(timezone=True), server_default=func.now())


class RainfallRecord(Base):
    __tablename__ = "rainfall_records"
    
    id = Column(Integer, primary_key=True, index=True)
    date_time = Column(DateTime, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    precipitation_amount = Column(Float, nullable=False)
    source = Column(String, default="CHIRPS")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    severity = Column(String, nullable=False, index=True)
    message = Column(Text, nullable=False)
    affected_radius_km = Column(Float, default=10.0)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)


class ModelMetrics(Base):
    __tablename__ = "model_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    model_type = Column(String, nullable=False, index=True)
    accuracy = Column(Float, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    inference_time_avg_ms = Column(Float, nullable=True)
    total_predictions = Column(Integer, default=0)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class SystemLog(Base):
    __tablename__ = "system_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    log_level = Column(String, nullable=False, index=True)
    message = Column(Text, nullable=False)
    endpoint = Column(String, nullable=True)
    user_id = Column(Integer, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
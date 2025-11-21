from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, LargeBinary, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
try:
    from app.core.database import Base
except ImportError:  # pragma: no cover
    from core.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    # community_member, ngo_partner, admin
    role = Column(String, default="community_member")
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
    user_id = Column(Integer, ForeignKey(
        "users.id"), nullable=True, index=True)
    flood_event_id = Column(Integer, ForeignKey(
        "flood_events.id"), nullable=True, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    flood_probability = Column(Float, nullable=False, index=True)
    # low, medium, high, critical
    risk_level = Column(String, nullable=True, index=True)
    model_type = Column(String, nullable=False, index=True)
    lead_time_hours = Column(Integer, nullable=False)
    confidence_score = Column(Float, nullable=True)
    features_used = Column(Text, nullable=True)
    inference_time_ms = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), index=True)

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
    user = relationship("User", back_populates="predictions",
                        foreign_keys=[user_id])
    flood_event = relationship("FloodEvent", back_populates="predictions")
    recommendations = relationship(
        "Recommendation", back_populates="prediction")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey(
        "predictions.id"), nullable=False, index=True)
    # dyke_placement, evacuation, etc.
    recommendation_type = Column(String, nullable=False, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    description = Column(Text, nullable=False)
    # low, medium, high, critical
    priority = Column(String, default="medium", index=True)
    estimated_cost = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    prediction = relationship("Prediction", back_populates="recommendations")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prediction_id = Column(Integer, ForeignKey(
        "predictions.id"), nullable=True)
    # accuracy, usability, alert_timing
    feedback_type = Column(String, nullable=False)
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
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), index=True)
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
    recorded_at = Column(DateTime(timezone=True),
                         server_default=func.now(), index=True)


class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    log_level = Column(String, nullable=False, index=True)
    message = Column(Text, nullable=False)
    endpoint = Column(String, nullable=True)
    user_id = Column(Integer, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), index=True)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(Text, nullable=False, unique=True)
    p256dh = Column(Text, nullable=True)
    auth = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), index=True)


class GEEExtractedFeature(Base):
    """
    Stores raw satellite features extracted from Google Earth Engine.
    This is the starting point for the ML pipeline - fresh data from GEE.
    """
    __tablename__ = "gee_extracted_features"

    id = Column(Integer, primary_key=True, index=True)
    # Jonglei, Unity, Upper Nile
    region = Column(String, nullable=False, index=True)
    extraction_date = Column(DateTime, nullable=False, index=True)

    # Time window for the extraction
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    # Precipitation features (CHIRPS)
    precipitation_sum = Column(Float, nullable=True)
    precipitation_mean = Column(Float, nullable=True)
    precipitation_max = Column(Float, nullable=True)
    precipitation_min = Column(Float, nullable=True)

    # SAR features (Sentinel-1)
    VV_mean = Column(Float, nullable=True)
    VV_std = Column(Float, nullable=True)
    VV_min = Column(Float, nullable=True)
    VV_max = Column(Float, nullable=True)
    VH_mean = Column(Float, nullable=True)
    VH_std = Column(Float, nullable=True)
    VH_min = Column(Float, nullable=True)
    VH_max = Column(Float, nullable=True)
    VV_stdDev_mean = Column(Float, nullable=True)
    VH_stdDev_mean = Column(Float, nullable=True)

    # Water features (JRC)
    water_occurrence_mean = Column(Float, nullable=True)
    water_occurrence_max = Column(Float, nullable=True)

    # Topography features (SRTM)
    elevation_mean = Column(Float, nullable=True)
    slope_mean = Column(Float, nullable=True)

    # Soil moisture features (SMAP) - optional
    soil_moisture_mean = Column(Float, nullable=True)

    # Metadata
    gee_project_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), index=True)


class SARFloodDetection(Base):
    """
    Stores SAR-based flood detection results with geopackage files.
    Each record represents a flood detection analysis for a specific AOI and time period.
    """
    __tablename__ = "sar_flood_detections"

    id = Column(Integer, primary_key=True, index=True)

    # User information (optional - for tracking who requested the detection)
    user_id = Column(Integer, ForeignKey(
        "users.id"), nullable=True, index=True)

    # Detection parameters
    bbox = Column(String, nullable=False)  # "xmin,ymin,xmax,ymax"
    center_latitude = Column(Float, nullable=False, index=True)
    center_longitude = Column(Float, nullable=False, index=True)

    # Time periods
    baseline_start = Column(DateTime, nullable=False)  # Before flood period
    baseline_end = Column(DateTime, nullable=False)
    flood_start = Column(DateTime, nullable=False)  # After flood period
    flood_end = Column(DateTime, nullable=False)

    # Detection settings
    polarization = Column(String, default="VV")  # VV or VH
    threshold = Column(Float, default=1.25)

    # Results
    # flood_detected, uncertain_detection, no_flood_detected, no_baseline_images, no_flood_images
    status = Column(String, nullable=False, index=True)
    confidence = Column(Float, nullable=True)  # 0-100
    # High, Medium, Low, Uncertain
    classification = Column(String, nullable=True)
    flood_area_hectares = Column(Float, nullable=True)
    flood_percentage = Column(Float, nullable=True)
    flood_patches = Column(Integer, nullable=True)
    message = Column(Text, nullable=True)

    # Image availability
    baseline_image_count = Column(Integer, default=0)
    flood_image_count = Column(Integer, default=0)

    # Geopackage file storage
    # flood_area_YYYYMMDDHHMMSS.gpkg
    geopackage_filename = Column(String, nullable=True)
    # Binary storage of .gpkg file
    geopackage_data = Column(LargeBinary, nullable=True)
    geopackage_size_bytes = Column(Integer, nullable=True)

    # GeoJSON preview (for quick access without unpacking binary)
    # Stores a simplified GeoJSON
    geojson_preview = Column(JSON, nullable=True)

    # Processing metadata
    processing_time_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])


class Location(Base):
    """
    Stores real-world locations (towns, villages, critical infrastructure)
    to be used instead of generated sample data.
    """
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    # settlement, hospital, school, infrastructure
    type = Column(String, default="settlement")
    population = Column(Integer, nullable=True)
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Shelter(Base):
    """
    Stores evacuation centers and safe zones.
    """
    __tablename__ = "shelters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, nullable=True)
    # school, church, community_center, dedicated_shelter
    type = Column(String, default="community_center")
    is_active = Column(Boolean, default=True)
    contact_info = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

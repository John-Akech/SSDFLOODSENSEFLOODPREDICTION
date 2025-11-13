"""
Database connection and operations for SAR flood detection service.
Connects to the main FloodSense PostgreSQL database.
"""
import os
import logging
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, LargeBinary, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional, Dict, Any
import json

logger = logging.getLogger(__name__)

# Database URL - connect to main FloodSense database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://floodsense_user:floodsense_password@db:5432/floodsense_db"
)

# Create engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class SARFloodDetection(Base):
    """
    Stores SAR-based flood detection results with geopackage files.
    """
    __tablename__ = "sar_flood_detections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    
    # Detection parameters
    bbox = Column(String, nullable=False)
    center_latitude = Column(Float, nullable=False, index=True)
    center_longitude = Column(Float, nullable=False, index=True)
    
    # Time periods
    baseline_start = Column(DateTime, nullable=False)
    baseline_end = Column(DateTime, nullable=False)
    flood_start = Column(DateTime, nullable=False)
    flood_end = Column(DateTime, nullable=False)
    
    # Detection settings
    polarization = Column(String, default="VV")
    threshold = Column(Float, default=1.25)
    
    # Results
    status = Column(String, nullable=False, index=True)
    confidence = Column(Float, nullable=True)
    classification = Column(String, nullable=True)
    flood_area_hectares = Column(Float, nullable=True)
    flood_percentage = Column(Float, nullable=True)
    flood_patches = Column(Integer, nullable=True)
    message = Column(Text, nullable=True)
    
    # Image availability
    baseline_image_count = Column(Integer, default=0)
    flood_image_count = Column(Integer, default=0)
    
    # Geopackage file storage
    geopackage_filename = Column(String, nullable=True)
    geopackage_data = Column(LargeBinary, nullable=True)
    geopackage_size_bytes = Column(Integer, nullable=True)
    
    # GeoJSON preview
    geojson_preview = Column(JSON, nullable=True)
    
    # Processing metadata
    processing_time_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


def get_db() -> Session:
    """Get database session."""
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        db.close()
        raise


def init_db():
    """Initialize database tables."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")


def save_flood_detection(
    db: Session,
    bbox: str,
    baseline_start: datetime,
    baseline_end: datetime,
    flood_start: datetime,
    flood_end: datetime,
    polarization: str,
    threshold: float,
    detection_results: Dict[str, Any],
    geopackage_path: Optional[str] = None,
    geojson_data: Optional[Dict] = None,
    processing_time: Optional[float] = None,
    user_id: Optional[int] = None
) -> SARFloodDetection:
    """
    Save flood detection results to database.
    
    Args:
        db: Database session
        bbox: Bounding box string "xmin,ymin,xmax,ymax"
        baseline_start: Baseline period start
        baseline_end: Baseline period end
        flood_start: Flood period start
        flood_end: Flood period end
        polarization: SAR polarization (VV or VH)
        threshold: Detection threshold
        detection_results: Results from flood_estimation()
        geopackage_path: Path to geopackage file
        geojson_data: GeoJSON feature collection
        processing_time: Processing time in seconds
        user_id: Optional user ID
        
    Returns:
        SARFloodDetection record
    """
    try:
        # Calculate center coordinates
        coords = [float(x) for x in bbox.split(",")]
        center_lat = (coords[1] + coords[3]) / 2
        center_lon = (coords[0] + coords[2]) / 2
        
        # Read geopackage file if provided
        geopackage_data = None
        geopackage_size = None
        geopackage_filename = None
        
        if geopackage_path and os.path.exists(geopackage_path):
            with open(geopackage_path, 'rb') as f:
                geopackage_data = f.read()
            geopackage_size = len(geopackage_data)
            geopackage_filename = os.path.basename(geopackage_path)
            logger.info(f"Loaded geopackage: {geopackage_filename} ({geopackage_size} bytes)")
        
        # Extract results
        flood_stats = detection_results.get("flood_area_stats", {})
        
        # Create record
        detection = SARFloodDetection(
            user_id=user_id,
            bbox=bbox,
            center_latitude=center_lat,
            center_longitude=center_lon,
            baseline_start=baseline_start,
            baseline_end=baseline_end,
            flood_start=flood_start,
            flood_end=flood_end,
            polarization=polarization,
            threshold=threshold,
            status=detection_results.get("status", "unknown"),
            confidence=flood_stats.get("confidence"),
            classification=flood_stats.get("classification"),
            flood_area_hectares=flood_stats.get("area_hectares"),
            flood_percentage=flood_stats.get("percentage"),
            flood_patches=flood_stats.get("patches"),
            message=detection_results.get("message"),
            baseline_image_count=detection_results.get("before_image_count", 0),
            flood_image_count=detection_results.get("after_image_count", 0),
            geopackage_filename=geopackage_filename,
            geopackage_data=geopackage_data,
            geopackage_size_bytes=geopackage_size,
            geojson_preview=geojson_data,
            processing_time_seconds=processing_time,
            error_message=detection_results.get("error")
        )
        
        db.add(detection)
        db.commit()
        db.refresh(detection)
        
        logger.info(f"Saved flood detection to database: ID={detection.id}, Status={detection.status}")
        return detection
        
    except Exception as e:
        logger.error(f"Error saving flood detection to database: {e}")
        db.rollback()
        raise


def get_detection_by_id(db: Session, detection_id: int) -> Optional[SARFloodDetection]:
    """Get flood detection by ID."""
    return db.query(SARFloodDetection).filter(SARFloodDetection.id == detection_id).first()


def get_recent_detections(db: Session, limit: int = 10) -> list:
    """Get recent flood detections."""
    return db.query(SARFloodDetection).order_by(SARFloodDetection.created_at.desc()).limit(limit).all()


def get_detections_by_area(
    db: Session,
    min_lat: float,
    max_lat: float,
    min_lon: float,
    max_lon: float,
    limit: int = 50
) -> list:
    """Get flood detections within a geographic area."""
    return db.query(SARFloodDetection).filter(
        SARFloodDetection.center_latitude.between(min_lat, max_lat),
        SARFloodDetection.center_longitude.between(min_lon, max_lon)
    ).order_by(SARFloodDetection.created_at.desc()).limit(limit).all()

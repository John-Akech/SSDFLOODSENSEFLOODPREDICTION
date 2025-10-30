from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import get_db
from schemas.schemas import *
from models.database_models import Prediction as DBPrediction, Alert as DBAlert
from services.model_service import ModelService
from services.alert_service import alert_service
from services.gis_service import GISService

logger = logging.getLogger(__name__)
router = APIRouter()








# Prediction endpoints
@router.post("/predictions", response_model=PredictionResponse)
async def create_prediction(
    request: PredictionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a flood prediction"""
    try:
        # Validate coordinates are not default/invalid values
        if (request.latitude == -90.0 and request.longitude == -180.0) or \
           (request.latitude == 0.0 and request.longitude == 0.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid coordinates: Please provide valid location coordinates for South Sudan (latitude: 3-13°N, longitude: 24-36°E)"
            )
        
        # Validate coordinates are within South Sudan bounds (approximate)
        if not (3 <= request.latitude <= 13 and 24 <= request.longitude <= 36):
            logger.warning(f"Coordinates outside South Sudan: {request.latitude}, {request.longitude}")
        
        # Generate features if not provided
        if request.features:
            features = request.features
        else:
            features = ModelService.generate_features_from_location(
                request.latitude, request.longitude
            )
        
        # Make prediction based on model type
        model_predictions = None
        inference_time = 0
        if request.model_type == ModelType.RANDOM_FOREST:
            probability, confidence, inference_time = ModelService.predict_rf(features)
        elif request.model_type == ModelType.TCN:
            probability, confidence, inference_time = ModelService.predict_tcn(features)
        elif request.model_type == ModelType.ENSEMBLE:
            probability, confidence, model_predictions, inference_time = ModelService.predict_ensemble(features)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid model type. Use: rf, tcn, or ensemble"
            )
        
        # Get risk level
        risk_level = ModelService.get_risk_level(probability)
        
        # Save to database
        db_prediction = DBPrediction(
            latitude=request.latitude,
            longitude=request.longitude,
            flood_probability=probability,
            model_type=request.model_type,
            lead_time_hours=request.lead_time_hours,
            confidence_score=confidence,
            risk_level=risk_level
        )
        db.add(db_prediction)
        db.commit()
        db.refresh(db_prediction)
        
        # Create alert if probability is significant
        if probability >= 0.3:
            alert = alert_service.create_alert(
                request.latitude,
                request.longitude,
                probability,
                request.model_type,
                request.lead_time_hours
            )
            
            # Send alert in background
            background_tasks.add_task(
                alert_service.send_web_push_alert,
                alert,
                []  # Would get user subscriptions from database
            )
        
        # Prepare response
        response = PredictionResponse(
            id=db_prediction.id,
            latitude=db_prediction.latitude,
            longitude=db_prediction.longitude,
            flood_probability=db_prediction.flood_probability,
            model_type=db_prediction.model_type,
            lead_time_hours=db_prediction.lead_time_hours,
            confidence_score=db_prediction.confidence_score,
            risk_level=db_prediction.risk_level,
            created_at=db_prediction.created_at,
            model_predictions=model_predictions
        )
        
        logger.info(f"Prediction created: {probability:.2%} flood risk at ({request.latitude}, {request.longitude})")
        return response
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error creating prediction: {e}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )





@router.post("/predictions/batch", response_model=BatchPredictionResponse)
async def create_batch_predictions(
    request: BatchPredictionRequest
):
    """Create predictions for multiple locations"""
    predictions = []
    high_risk_count = 0
    
    for location in request.locations:
        try:
            if "lat" not in location or "lon" not in location:
                continue
            lat, lon = location["lat"], location["lon"]
            
            # Generate features
            features = ModelService.generate_features_from_location(lat, lon)
            
            # Make prediction
            if request.model_type == ModelType.RANDOM_FOREST:
                probability, confidence, _ = ModelService.predict_rf(features)
            elif request.model_type == ModelType.TCN:
                probability, confidence, _ = ModelService.predict_tcn(features)
            elif request.model_type == ModelType.ENSEMBLE:
                probability, confidence, _, _ = ModelService.predict_ensemble(features)
            else:
                continue
            
            # Get risk level
            risk_level = ModelService.get_risk_level(probability)
            
            if risk_level in ["high", "critical"]:
                high_risk_count += 1
            
            predictions.append(PredictionResponse(
                id=0,
                latitude=lat,
                longitude=lon,
                flood_probability=probability,
                model_type=request.model_type,
                lead_time_hours=request.lead_time_hours,
                confidence_score=confidence,
                risk_level=risk_level,
                created_at=datetime.utcnow()
            ))
            
        except Exception as e:
            logger.error(f"Error in batch prediction for location {location}: {e}")
            continue
    
    summary = {
        "total_locations": len(request.locations),
        "successful_predictions": len(predictions),
        "high_risk_locations": high_risk_count,
        "average_flood_probability": sum(p.flood_probability for p in predictions) / len(predictions) if predictions else 0
    }
    
    return BatchPredictionResponse(predictions=predictions, summary=summary)


# GIS and recommendations endpoints
@router.post("/recommendations/dyke-placement", response_model=DykePlacementResponse)
async def get_dyke_recommendations(
    request: DykePlacementRequest
):
    """Get dyke placement recommendations"""
    recommendations = GISService.generate_dyke_recommendations(
        request.latitude,
        request.longitude,
        request.flood_probability,
        request.elevation,
        request.river_distance
    )
    
    # Create map with recommendations
    map_html = GISService.create_flood_risk_map(
        request.latitude,
        request.longitude,
        predictions=[{
            "latitude": request.latitude,
            "longitude": request.longitude,
            "flood_probability": request.flood_probability,
            "risk_level": ModelService.get_risk_level(request.flood_probability),
            "model_type": "analysis"
        }],
        recommendations=recommendations
    )
    
    return DykePlacementResponse(
        recommendations=recommendations,
        map_data={"html": map_html}
    )

@router.get("/gis/flood-zones")
async def get_flood_zones(
    north: Optional[float] = None,
    south: Optional[float] = None,
    east: Optional[float] = None,
    west: Optional[float] = None
):
    """Get flood zones for a given bounding box"""
    try:
        # If no bounds provided, return all active alerts as flood zones
        zones = []
        
        # You can add actual flood zone data from GIS service here
        # For now, return empty zones
        return {
            "zones": zones,
            "count": len(zones)
        }
    except Exception as e:
        logger.error(f"Error getting flood zones: {e}")
        return {"zones": [], "count": 0}

@router.get("/gis/elevation")
async def get_elevation(
    lat: float,
    lng: float
):
    """Get elevation data for a specific location"""
    try:
        # In a real implementation, this would fetch elevation from a DEM
        # For now, return mock data
        return {
            "latitude": lat,
            "longitude": lng,
            "elevation": 450.0,  # Mock elevation in meters
            "source": "mock"
        }
    except Exception as e:
        logger.error(f"Error getting elevation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gis/water-bodies")
async def get_water_bodies(
    north: Optional[float] = None,
    south: Optional[float] = None,
    east: Optional[float] = None,
    west: Optional[float] = None
):
    """Get water bodies for a given bounding box"""
    try:
        # If no bounds provided, return empty
        bodies = []
        
        # You can add actual water body data from GIS service here
        return {
            "bodies": bodies,
            "count": len(bodies)
        }
    except Exception as e:
        logger.error(f"Error getting water bodies: {e}")
        return {"bodies": [], "count": 0}


# Alert endpoints - Moved to crud_routes.py to avoid conflicts
# The old alert service endpoints are now handled by CRUD operations on the database





















# Health check endpoint
@router.get("/health")
async def health_check():
    """API health check"""
    return {
        "status": "healthy",
        "models_loaded": ModelService.models_loaded,
        "timestamp": datetime.utcnow()
    }

@router.get("/status")
async def get_system_status(db: Session = Depends(get_db)):
    """Get system status for real-time monitoring"""
    try:
        total_alerts = db.query(DBAlert).filter(DBAlert.is_active == True).count()
        total_predictions = db.query(DBPrediction).count()
        critical_alerts = db.query(DBAlert).filter(
            DBAlert.is_active == True,
            DBAlert.severity == "critical"
        ).count()
        
        return {
            "status": "operational",
            "uptime": "99.9%",
            "active_alerts": total_alerts,
            "critical_alerts": critical_alerts,
            "total_predictions": total_predictions,
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/flood/status")
async def get_flood_status(db: Session = Depends(get_db)):
    """Get real-time flood status"""
    try:
        active_alerts = db.query(DBAlert).filter(DBAlert.is_active == True).all()
        
        return {
            "alerts": [
                {
                    "id": alert.id,
                    "latitude": alert.latitude,
                    "longitude": alert.longitude,
                    "severity": alert.severity,
                    "message": alert.message,
                    "created_at": alert.created_at.isoformat() if alert.created_at else None
                } for alert in active_alerts
            ],
            "count": len(active_alerts),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting flood status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
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
from models.database_models import Prediction as DBPrediction
from services.model_service import ModelService
from services.alert_service import alert_service
from services.gis_service import GISService

logger = logging.getLogger(__name__)
router = APIRouter()








# Prediction endpoints
@router.post("/predictions", response_model=PredictionResponse)
async def create_prediction(
    request: PredictionRequest,
    background_tasks: BackgroundTasks
):
    """Create a flood prediction"""
    try:
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
        elif request.model_type == ModelType.PROTOTYPICAL:
            probability, confidence = ModelService.predict_prototypical(features)
            inference_time = 0
        elif request.model_type == ModelType.ENSEMBLE:
            probability, confidence, model_predictions, inference_time = ModelService.predict_ensemble(features)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid model type"
            )
        
        # Get risk level
        risk_level = ModelService.get_risk_level(probability)
        
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
            id=1,
            latitude=request.latitude,
            longitude=request.longitude,
            flood_probability=probability,
            model_type=request.model_type,
            lead_time_hours=request.lead_time_hours,
            confidence_score=confidence,
            risk_level=risk_level,
            created_at=datetime.utcnow(),
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
            else:
                probability, confidence = ModelService.predict_prototypical(features)
            
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


# Alert endpoints
@router.get("/alerts")
async def get_active_alerts(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: float = 50
):
    """Get active flood alerts"""
    try:
        alerts = alert_service.get_active_alerts(latitude, longitude, radius_km)
        
        return {
            "alerts": [
                {
                    "id": alert.id,
                    "latitude": alert.latitude,
                    "longitude": alert.longitude,
                    "message": alert.message,
                    "severity": alert.severity,
                    "created_at": alert.created_at.isoformat(),
                    "expires_at": alert.expires_at.isoformat() if alert.expires_at else None
                }
                for alert in alerts
            ],
            "count": len(alerts)
        }
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        return {"alerts": [], "count": 0}





















# Health check endpoint
@router.get("/health")
async def health_check():
    """API health check"""
    return {
        "status": "healthy",
        "models_loaded": ModelService.models_loaded,
        "timestamp": datetime.utcnow()
    }
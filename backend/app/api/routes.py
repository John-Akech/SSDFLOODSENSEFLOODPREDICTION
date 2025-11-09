from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime
import logging
import httpx

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import get_db
from schemas.schemas import *
from models.database_models import Prediction as DBPrediction, Alert as DBAlert
from services.model_service import ModelService
from services.alert_service import alert_service
from models.database_models import Prediction as DBPrediction, Alert as DBAlert, PushSubscription as DBPush
from services.gis_service import GISService

logger = logging.getLogger(__name__)
router = APIRouter()

# SAR service configuration
SAR_SERVICE_URL = os.getenv("SAR_SERVICE_URL", "http://localhost:8080")


async def fetch_gee_features(latitude: float, longitude: float, lead_time_hours: int = 12) -> dict:
    """Fetch satellite features from SAR detection service
    
    Args:
        latitude: Location latitude
        longitude: Location longitude
        lead_time_hours: Forecast lead time in hours
        
    Returns:
        Dictionary with GEE-extracted features
        
    Raises:
        HTTPException: If SAR service is unavailable or returns error
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SAR_SERVICE_URL}/extract-features",
                json={
                    "latitude": latitude,
                    "longitude": longitude,
                    "buffer_km": 5.0,  # 5km radius for feature extraction
                    "lead_time_hours": lead_time_hours
                }
            )
            
            if response.status_code == 200:
                gee_data = response.json()
                logger.info(f"Successfully fetched GEE features for ({latitude}, {longitude})")
                return gee_data.get("features", {})
            else:
                error_detail = response.json().get("detail", "Unknown error")
                logger.error(f"SAR service error: {response.status_code} - {error_detail}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Failed to fetch satellite data: {error_detail}"
                )
                
    except httpx.TimeoutException:
        logger.error(f"SAR service timeout for ({latitude}, {longitude})")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Satellite data service timeout. Please try again."
        )
    except httpx.ConnectError:
        logger.error(f"Cannot connect to SAR service at {SAR_SERVICE_URL}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Satellite data service unavailable. Please ensure SAR detection service is running."
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching GEE features: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching satellite data: {str(e)}"
        )








# Prediction endpoints
@router.post("/predictions", response_model=PredictionResponse)
async def create_prediction(
    request: PredictionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a flood prediction"""
    try:
        logger.info(f"=== Prediction request received: lat={request.latitude}, lon={request.longitude}, model_type={request.model_type} ===")
        logger.info(f"Models loaded status: {ModelService.models_loaded}")
        logger.info(f"RF model: {ModelService.rf_model is not None}, GB model: {ModelService.gb_model is not None}")
        
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
        
        # Get features: either from request or fetch from SAR service
        if request.features:
            # Realtime-safe feature guard: disallow leak-prone fields
            forbidden = {"sar_after", "sar_difference", "sar_change"}
            if any(k in forbidden for k in request.features.keys()):
                raise HTTPException(
                    status_code=400, 
                    detail="Forbidden realtime features in request. Please omit derived 'after' SAR features."
                )
            features = request.features
            logger.info(f"Using provided features for prediction at ({request.latitude}, {request.longitude})")
        else:
            # Auto-fetch features from SAR service
            logger.info(f"Fetching satellite features from SAR service for ({request.latitude}, {request.longitude})")
            try:
                gee_features = await fetch_gee_features(
                    request.latitude, 
                    request.longitude, 
                    request.lead_time_hours
                )
                
                # Map GEE features to model format
                features = ModelService.map_gee_to_model_features(
                    gee_features, 
                    request.latitude, 
                    request.longitude
                )
                logger.info(f"Successfully mapped {len(features)} features from GEE data")
                
            except ValueError as ve:
                logger.error(f"Feature mapping error: {ve}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Incomplete satellite data: {str(ve)}"
                )
            except HTTPException:
                # Re-raise HTTP exceptions from fetch_gee_features
                raise
            except Exception as e:
                logger.error(f"Unexpected error fetching/mapping features: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to process satellite data: {str(e)}"
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
        
        # PRODUCTION: Confidence-Based Risk Adjustment
        # RULE: Never show "high" or "critical" risk if confidence < 60%
        is_reliable = confidence >= 0.60
        warning_message = None
        
        if not is_reliable:
            # Downgrade risk level for low confidence predictions
            if risk_level in ["critical", "high"]:
                original_risk = risk_level
                risk_level = "uncertain"  # Force to uncertain instead of contradicting
                warning_message = (
                    f"Low confidence prediction ({confidence:.1%}). "
                    f"Models suggest {original_risk} risk ({probability:.1%} flood probability), "
                    f"but prediction reliability is insufficient for alert. "
                    f"Possible reasons: (1) High model disagreement (RF: {model_predictions.get('rf', 'N/A') if model_predictions else 'N/A':.1%}, "
                    f"GB: {model_predictions.get('gb', 'N/A') if model_predictions else 'N/A':.1%}), "
                    f"(2) Location outside training data coverage, or (3) Unusual environmental conditions. "
                    f"Manual verification strongly recommended."
                )
            else:
                warning_message = (
                    f"Low confidence prediction ({confidence:.1%}). "
                    f"Model uncertainty is high - treat result with caution. "
                    f"Consider collecting more ground truth data for this region."
                )
            
            logger.warning(
                f"Low confidence prediction: {confidence:.1%} at ({request.latitude}, {request.longitude}). "
                f"Probability: {probability:.2%}, Risk downgraded to: {risk_level}"
            )
        
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
        # Record inference latency
        db_prediction.inference_time_ms = float(inference_time)
        db.add(db_prediction)
        db.commit()
        db.refresh(db_prediction)
        
        # Create alert only for reliable predictions with significant probability
        if probability >= 0.3 and is_reliable:
            alert = alert_service.create_alert(
                request.latitude,
                request.longitude,
                probability,
                request.model_type,
                request.lead_time_hours
            )
            
            # Send alert in background (fetch subscriptions)
            subs = db.query(DBPush).all()
            subscription_payloads = [
                {
                    "endpoint": s.endpoint,
                    "keys": {"p256dh": s.p256dh, "auth": s.auth}
                } for s in subs if s.endpoint
            ]
            background_tasks.add_task(
                alert_service.send_web_push_alert,
                alert,
                subscription_payloads
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
            model_predictions=model_predictions,
            is_reliable=is_reliable,
            warning=warning_message
        )
        
        log_message = f"Prediction created: {probability:.2%} flood risk at ({request.latitude}, {request.longitude})"
        if not is_reliable:
            log_message += f" [LOW CONFIDENCE: {confidence:.1%}]"
        logger.info(log_message)
        
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
    request: BatchPredictionRequest,
    db: Session = Depends(get_db)
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
                probability, confidence, inf_ms = ModelService.predict_rf(features)
            elif request.model_type == ModelType.TCN:
                probability, confidence, inf_ms = ModelService.predict_tcn(features)
            elif request.model_type == ModelType.ENSEMBLE:
                probability, confidence, _, inf_ms = ModelService.predict_ensemble(features)
            else:
                continue
            
            # Get risk level
            risk_level = ModelService.get_risk_level(probability)
            
            if risk_level in ["high", "critical"]:
                high_risk_count += 1
            
            # Persist batch prediction (lightweight record)
            db_pred = DBPrediction(
                latitude=lat,
                longitude=lon,
                flood_probability=probability,
                model_type=request.model_type,
                lead_time_hours=request.lead_time_hours,
                confidence_score=confidence,
                risk_level=risk_level,
                inference_time_ms=float(inf_ms)
            )
            db.add(db_pred)
            db.commit()
            db.refresh(db_pred)

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
    """Get elevation data for a specific location using Open-Elevation API or SRTM data"""
    try:
        # Try to fetch elevation from Open-Elevation API (free, open source)
        import requests
        try:
            response = requests.get(
                f"https://api.open-elevation.com/api/v1/lookup?locations={lat},{lng}",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('results') and len(data['results']) > 0:
                    elevation = data['results'][0]['elevation']
                    return {
                        "latitude": lat,
                        "longitude": lng,
                        "elevation": elevation,
                        "source": "open-elevation"
                    }
        except Exception as api_error:
            logger.warning(f"Open-Elevation API failed: {api_error}, using estimated elevation")
        
        # Fallback: Use estimated elevation based on South Sudan topography
        # South Sudan elevation ranges: 400-500m (plains), up to 3000m+ (mountains)
        # Using latitude-based estimation (rough approximation)
        if lat < 5:  # Southern regions (higher elevations)
            estimated_elevation = 500 + (5 - lat) * 100
        elif lat > 10:  # Northern regions (lower elevations)
            estimated_elevation = 400 - (lat - 10) * 20
        else:  # Central regions
            estimated_elevation = 420
        
        return {
            "latitude": lat,
            "longitude": lng,
            "elevation": round(estimated_elevation, 1),
            "source": "estimated",
            "note": "Elevation estimated based on regional topography. For precise data, integrate SRTM DEM."
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


@router.get("/models/info")
async def get_models_info():
    """Return lightweight metadata about loaded models (types, sizes, basic attributes)."""
    try:
        return ModelService.get_model_metadata()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/sanity")
async def models_sanity(dataset: str = "data/south_sudan_flood_combined_data.csv"):
    """Run a quick sanity prediction using the first row of a dataset."""
    try:
        return ModelService.sanity_predict_from_dataset(dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/validate")
async def validate_models(dataset: str = "data/original_gee_data_2019_2024/flood_validation_data_2019_2024.csv"):
    try:
        metrics = ModelService.validate_on_csv(dataset)
        return {"dataset": dataset, "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/calibrate")
async def calibrate_models(dataset: str = "data/original_gee_data_2019_2024/flood_validation_data_2019_2024.csv"):
    try:
        params = ModelService.fit_calibration(dataset)
        return {"dataset": dataset, "calibration": params}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/features/from-gee")
async def features_from_gee(lat: float, lon: float):
    """Get real-time features from Google Earth Engine (GEE) service
    
    This endpoint integrates with the ee-fastapi service to extract real SAR,
    precipitation, elevation, and other environmental features from satellite data.
    
    PRODUCTION POLICY: Returns HTTP 503 if GEE service unavailable.
    NO SYNTHETIC FALLBACK - zero tolerance for mock data.
    """
    try:
        # Call GEE service to extract features
        import requests
        gee_service_url = os.getenv("GEE_SERVICE_URL", "http://ee-fastapi:8001")
        
        try:
            response = requests.get(
                f"{gee_service_url}/api/features/extract",
                params={"lat": lat, "lon": lon},
                timeout=10
            )
            
            if response.status_code == 200:
                gee_features = response.json()
                return {
                    "latitude": lat,
                    "longitude": lon,
                    "features": gee_features.get("features", {}),
                    "source": "google_earth_engine",
                    "timestamp": gee_features.get("timestamp")
                }
            elif response.status_code == 503:
                raise HTTPException(
                    status_code=503,
                    detail="GEE service temporarily unavailable. Cannot extract satellite features."
                )
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"GEE service error: {response.text}"
                )
                
        except requests.exceptions.Timeout:
            logger.error(f"GEE service timeout for location ({lat}, {lon})")
            raise HTTPException(
                status_code=503,
                detail="GEE service timeout. Cannot extract satellite features without real data."
            )
        except requests.exceptions.ConnectionError as e:
            logger.error(f"GEE service connection failed: {e}")
            raise HTTPException(
                status_code=503,
                detail="GEE service unavailable. Cannot make predictions without real satellite data."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting features: {e}")
        raise HTTPException(status_code=500, detail=f"Feature extraction failed: {str(e)}")

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Production health check - validates all critical systems
    
    Returns HTTP 200 only if ALL systems operational.
    Returns HTTP 503 if any critical system unavailable.
    
    Checks:
    - Models loaded and ready
    - Database connection
    - GEE service availability (optional warning)
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "checks": {}
    }
    
    # Check 1: Models loaded
    models_status = "healthy"
    if not ModelService.models_loaded:
        health_status["status"] = "unhealthy"
        models_status = "failed - ML models not loaded"
        health_status["checks"]["models"] = {
            "status": "failed",
            "message": "ML models not loaded - predictions unavailable"
        }
    else:
        models_status = f"healthy - RF={'✓' if ModelService.rf_model else '✗'}, TCN={'✓' if ModelService.tcn_model else '✗'}, GB={'✓' if ModelService.gb_model else '✗'}"
        health_status["checks"]["models"] = {
            "status": "healthy",
            "rf_loaded": ModelService.rf_model is not None,
            "tcn_loaded": ModelService.tcn_model is not None,
            "gb_loaded": ModelService.gb_model is not None,
            "scaler_loaded": ModelService.scaler is not None
        }
    
    # Check 2: Database connection
    database_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
        database_status = "healthy - connection active"
        health_status["checks"]["database"] = {
            "status": "healthy",
            "message": "Database connection active"
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        database_status = f"failed - {str(e)}"
        health_status["checks"]["database"] = {
            "status": "failed",
            "message": f"Database connection failed: {str(e)}"
        }
    
    # Check 3: GEE service (warning only, not critical)
    try:
        import requests
        gee_service_url = os.getenv("GEE_SERVICE_URL", "http://ee-fastapi:8001")
        response = requests.get(f"{gee_service_url}/health", timeout=5)
        if response.status_code == 200:
            health_status["checks"]["gee_service"] = {
                "status": "healthy",
                "url": gee_service_url
            }
        else:
            health_status["checks"]["gee_service"] = {
                "status": "warning",
                "message": f"GEE service returned status {response.status_code}",
                "impact": "Real-time predictions unavailable"
            }
    except Exception as e:
        health_status["checks"]["gee_service"] = {
            "status": "warning",
            "message": f"GEE service unreachable: {str(e)}",
            "impact": "Real-time predictions unavailable"
        }
    
    # Add simple top-level fields for backward compatibility with tests
    health_status["database"] = database_status
    health_status["models"] = models_status
    
    # Return appropriate HTTP status
    if health_status["status"] == "unhealthy":
        raise HTTPException(status_code=503, detail=health_status)
    
    return health_status

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
    """Get real-time flood status with comprehensive metrics"""
    try:
        # Get active alerts
        active_alerts = db.query(DBAlert).filter(DBAlert.is_active == True).all()
        
        # Get high-risk predictions (probability > 0.65 = 65%)
        # Note: Threshold set to 65% to include "high" risk level predictions
        high_risk_predictions = db.query(DBPrediction).filter(
            DBPrediction.flood_probability > 0.65
        ).all()
        
        # Extract unique high-risk areas (group by approximate location)
        high_risk_areas = []
        seen_locations = set()
        for pred in high_risk_predictions:
            # Round to 2 decimal places to group nearby locations
            loc_key = (round(pred.latitude, 2), round(pred.longitude, 2))
            if loc_key not in seen_locations:
                seen_locations.add(loc_key)
                high_risk_areas.append({
                    "latitude": pred.latitude,
                    "longitude": pred.longitude,
                    "risk_level": pred.risk_level,
                    "probability": pred.flood_probability
                })
        
        # Estimate affected population (rough estimate: 1000 people per high-risk area)
        # In production, this would query actual census/population data
        estimated_population = len(high_risk_areas) * 1000
        
        return {
            "active_floods": len(active_alerts),
            "high_risk_areas": len(high_risk_areas),
            "affected_population": estimated_population,
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
            "high_risk_locations": high_risk_areas[:10],  # Top 10 high-risk locations
            "count": len(active_alerts),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting flood status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
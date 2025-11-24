from fastapi import FastAPI, Request, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
import uvicorn
import ee
import os
import time
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime
import geopandas as gpd

from src.utils import raster_to_vector
from src.model import db_creator, flood_estimation, display
from src.config import settings
from src.database import get_db, init_db, save_flood_detection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global state for GEE initialization
gee_initialized = False
gee_error = None

# Try to initialize Earth Engine on startup
try:
    import base64

    # Debug: Log ALL environment variables to diagnose issue
    logger.info("[DEBUG] ===== ENVIRONMENT VARIABLES DIAGNOSTIC =====")
    all_env_vars = dict(os.environ)
    gee_related = {
        k: v[:50] + '...' if len(v) > 50 else v for k, v in all_env_vars.items() if 'GEE' in k.upper()}
    logger.info(f"[DEBUG] GEE-related env vars: {gee_related}")
    logger.info(f"[DEBUG] Total env vars: {len(all_env_vars)}")
    logger.info("[DEBUG] =============================================")

    project_id = os.getenv('GEE_PROJECT_ID', 'ace-connection-474712-p1')
    service_account_key_env = os.getenv('GEE_SERVICE_ACCOUNT_KEY', '')
    service_account_key_base64 = os.getenv(
        'GEE_SERVICE_ACCOUNT_KEY_BASE64', '')
    service_account_file = '/app/gee-service-account-key.json'

    # Debug: Log environment variable info
    logger.info(
        f"[DEBUG] GEE_SERVICE_ACCOUNT_KEY present: {bool(service_account_key_env)}")
    logger.info(
        f"[DEBUG] GEE_SERVICE_ACCOUNT_KEY_BASE64 present: {bool(service_account_key_base64)}")
    logger.info(f"[DEBUG] GEE_PROJECT_ID value: {project_id}")

    # Try base64-encoded version first
    if service_account_key_base64:
        try:
            logger.info("[INFO] Decoding base64-encoded service account key")
            decoded_json = base64.b64decode(
                service_account_key_base64).decode('utf-8')
            logger.info(f"[INFO] Decoded JSON length: {len(decoded_json)}")
            with open(service_account_file, 'w') as f:
                f.write(decoded_json)
            logger.info(
                f"[INFO] Service account key written from base64 to: {service_account_file}")
            service_account_key_env = decoded_json  # Use decoded version
        except Exception as e:
            logger.error(f"[ERROR] Failed to decode base64: {e}")

    if service_account_key_env:
        logger.info(
            f"[DEBUG] GEE_SERVICE_ACCOUNT_KEY length: {len(service_account_key_env)}")
        logger.info(
            f"[DEBUG] Starts with '{{': {service_account_key_env.strip().startswith('{')}")
        logger.info(f"[DEBUG] First 50 chars: {service_account_key_env[:50]}")

    # Check if GEE_SERVICE_ACCOUNT_KEY contains JSON content (production)
    if service_account_key_env and (service_account_key_env.strip().startswith('{') or len(service_account_key_env) > 200):
        logger.info(
            "[INFO] Writing service account key from environment variable")
        # Write the JSON content to file
        with open(service_account_file, 'w') as f:
            f.write(service_account_key_env)
        logger.info(
            f"[INFO] Service account key written to: {service_account_file}")

    # Check if service account key file exists
    if os.path.exists(service_account_file):
        logger.info(
            f"[INFO] Using service account authentication: {service_account_file}")
        logger.info(f"[INFO] Project ID: {project_id}")

        # Read service account credentials
        with open(service_account_file, 'r') as f:
            import json
            service_account_info = json.load(f)
            service_account_email = service_account_info.get(
                'client_email', 'unknown')

        logger.info(f"[INFO] Service account email: {service_account_email}")

        # Initialize with service account
        credentials = ee.ServiceAccountCredentials(
            service_account_email, service_account_file)
        ee.Initialize(credentials, project=project_id)

        logger.info(
            f"[OK] Earth Engine initialized successfully with service account")
        logger.info(f"[OK] Project: {project_id}")
        gee_initialized = True

    else:
        # Fallback to default credentials (for local development)
        logger.warning(
            f"[WARN] Service account key not found at: {service_account_file}")
        logger.info(
            "[INFO] Attempting Earth Engine initialization with default credentials...")

        if project_id:
            ee.Initialize(project=project_id)
            logger.info(
                f"[OK] Earth Engine initialized with default credentials and project: {project_id}")
        else:
            ee.Initialize()
            logger.info(
                "[OK] Earth Engine initialized with default credentials (no project)")

        gee_initialized = True

except Exception as e:
    gee_error = str(e)
    logger.error(f"[ERROR] Earth Engine initialization failed: {e}")
    logger.error("[ERROR] Please ensure:")
    logger.error(
        "  1. Service account key file exists at /app/gee-service-account-key.json")
    logger.error("  2. Service account has Earth Engine access enabled")
    logger.error("  3. Project ID is correct: ace-connection-474712-p1")
    gee_initialized = False

app = FastAPI(
    title="FloodSense SAR Detection API",
    description="Community-Based Predictive Flood Forecasting Using SAR and AI for South Sudan",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Initialize database on startup


@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup."""
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models


class FloodDetectionRequest(BaseModel):
    bbox: str = Field(..., description="Bounding box as 'xmin,ymin,xmax,ymax'")
    init_start: str = Field(...,
                            description="Base period start date (YYYY-MM-DD)")
    init_last: str = Field(...,
                           description="Base period end date (YYYY-MM-DD)")
    flood_start: str = Field(...,
                             description="Flood period start date (YYYY-MM-DD)")
    flood_last: str = Field(...,
                            description="Flood period end date (YYYY-MM-DD)")
    flood_threshold: float = Field(default=1.25, ge=1.0, le=3.0)

    @field_validator('bbox')
    @classmethod
    def validate_bbox(cls, v):
        try:
            coords = [float(x) for x in v.split(",")]
            if len(coords) != 4:
                raise ValueError("Bbox must have 4 coordinates")
            xmin, ymin, xmax, ymax = coords
            if not (-180 <= xmin < xmax <= 180):
                raise ValueError("Invalid longitude range")
            if not (-90 <= ymin < ymax <= 90):
                raise ValueError("Invalid latitude range")
            return v
        except Exception as e:
            raise ValueError(f"Invalid bbox format: {str(e)}")


class FloodDetectionResponse(BaseModel):
    before_tile: str
    after_tile: str
    flood_tile: str
    permanent_water_tile: Optional[str] = None
    high_slope_tile: Optional[str] = None
    flood_area_ha: Optional[float] = None
    confidence: Optional[float] = None
    flood_patches: Optional[int] = None
    status: Optional[str] = "success"
    message: Optional[str] = "Detection completed successfully"
    metadata: dict


class FeatureExtractionRequest(BaseModel):
    latitude: float = Field(..., description="Location latitude")
    longitude: float = Field(..., description="Location longitude")
    buffer_km: float = Field(5.0, description="Buffer radius in kilometers")
    lead_time_hours: int = Field(12, description="Forecast lead time in hours")


# Ensure output directory exists
output_dir = Path(settings.OUTPUT_DIR)
output_dir.mkdir(exist_ok=True)

# Mount static folders
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/output", StaticFiles(directory=str(output_dir)), name="output")

# Load templates
templates = Jinja2Templates(directory="template")


@app.get("/", tags=["UI"])
async def map_view(request: Request):
    """Render interactive flood detection map."""
    return templates.TemplateResponse("map.html", {"request": request})


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint - fast response for container health checks."""
    return {
        "status": "healthy",
        "service": "FloodSense SAR Detection",
        "version": "2.0.0"
    }


@app.get("/gee/status", tags=["Authentication"])
async def gee_status():
    """Check Google Earth Engine authentication status."""
    return {
        "initialized": gee_initialized,
        "error": gee_error if not gee_initialized else None,
        "requires_auth": not gee_initialized
    }


@app.get("/sentinel1/availability", tags=["Data Availability"])
async def check_sentinel1_availability(lat: float, lon: float, start_date: str = None, end_date: str = None):
    """Check latest available Sentinel-1 data for a location.

    Args:
        lat: Latitude of point
        lon: Longitude of point
        start_date: Optional start date to check (YYYY-MM-DD)
        end_date: Optional end date to check (YYYY-MM-DD)

    Returns:
        Latest available Sentinel-1 image date and coverage info
    """
    if not gee_initialized:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google Earth Engine not authenticated"
        )

    try:
        from datetime import datetime, timedelta
        point = ee.Geometry.Point([lon, lat])

        # If specific date range provided, check that range
        if start_date and end_date:
            count = (ee.ImageCollection("COPERNICUS/S1_GRD")
                     .filterBounds(point)
                     .filterDate(start_date, end_date)
                     .filter(ee.Filter.eq("instrumentMode", "IW"))
                     .size()
                     .getInfo())

            return {
                "date_range": f"{start_date} to {end_date}",
                "image_count": count,
                "has_coverage": count > 0,
                "message": f"Found {count} Sentinel-1 images for this period" if count > 0 else "No Sentinel-1 images found for this period"
            }

        # Get most recent Sentinel-1 image
        s1_collection = (ee.ImageCollection("COPERNICUS/S1_GRD")
                         .filterBounds(point)
                         .filter(ee.Filter.eq("instrumentMode", "IW"))
                         .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
                         .sort("system:time_start", False)  # Most recent first
                         .limit(1))

        # Get the date of the most recent image
        latest_image = s1_collection.first()
        if latest_image.getInfo():
            latest_date = ee.Date(latest_image.get(
                "system:time_start")).format("YYYY-MM-dd").getInfo()

            # Get count of images in last 30 days
            today = datetime.now()
            thirty_days_ago = (today - timedelta(days=30)).strftime("%Y-%m-%d")

            recent_count = (ee.ImageCollection("COPERNICUS/S1_GRD")
                            .filterBounds(point)
                            .filterDate(thirty_days_ago, today.strftime("%Y-%m-%d"))
                            .filter(ee.Filter.eq("instrumentMode", "IW"))
                            .size()
                            .getInfo())

            return {
                "available": True,
                "latest_date": latest_date,
                "images_last_30_days": recent_count,
                "message": f"Latest Sentinel-1 image: {latest_date}. Use dates up to this for real-time detection.",
                "recommended_flood_period_start": (datetime.strptime(latest_date, "%Y-%m-%d") - timedelta(days=14)).strftime("%Y-%m-%d"),
                "recommended_flood_period_end": latest_date
            }
        else:
            return {
                "available": False,
                "message": "No Sentinel-1 coverage for this location"
            }

    except Exception as e:
        logger.error(f"Error checking Sentinel-1 availability: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check data availability: {str(e)}"
        )


@app.post("/gee/authenticate", tags=["Authentication"])
async def gee_authenticate(project_id: Optional[str] = None):
    """Initialize Google Earth Engine with project ID."""
    global gee_initialized, gee_error

    try:
        if project_id:
            ee.Initialize(project=project_id)
        else:
            ee.Initialize()

        gee_initialized = True
        gee_error = None
        logger.info(
            f"[OK] Earth Engine initialized with project: {project_id or 'default'}")

        return {
            "success": True,
            "message": "Earth Engine authenticated successfully",
            "project_id": project_id
        }
    except Exception as e:
        gee_error = str(e)
        logger.error(f"[FAIL] Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


@app.post("/flood_detect", tags=["Flood Detection"])
async def flood_detect(request: FloodDetectionRequest, db: Session = Depends(get_db)):
    """Run flood detection and save results to database (no direct download)."""
    if not gee_initialized:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google Earth Engine not authenticated. Please authenticate first."
        )

    start_time = time.time()

    try:
        # Parse bbox
        xmin, ymin, xmax, ymax = [float(x) for x in request.bbox.split(",")]
        ee_rectangle = ee.Geometry.Rectangle([xmin, ymin, xmax, ymax])

        # Create date ranges
        base_period = (request.init_start, request.init_last)
        flood_period = (request.flood_start, request.flood_last)

        # Parse dates for database
        baseline_start = datetime.strptime(request.init_start, "%Y-%m-%d")
        baseline_end = datetime.strptime(request.init_last, "%Y-%m-%d")
        flood_start = datetime.strptime(request.flood_start, "%Y-%m-%d")
        flood_end = datetime.strptime(request.flood_last, "%Y-%m-%d")

        # Run flood detection
        logger.info(f"Processing flood detection for bbox: {request.bbox}")
        dict_db = db_creator(base_period, flood_period, ee_rectangle)

        # Check if image collection failed
        if dict_db.get("status") in ["no_baseline_images", "no_flood_images"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=dict_db.get(
                    "message", "No satellite images available for the selected time period")
            )

        flood_added = flood_estimation(
            dict_db, difference_threshold=request.flood_threshold)

        # Check if no flood was detected
        if flood_added.get("status") == "no_flood_detected":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No flood areas detected in the selected region and time period"
            )

        # Generate output filename
        timestamp = time.strftime("%Y%m%d%H%M%S", time.gmtime())
        filename = f'flood_area_{timestamp}.gpkg'
        output_path = output_dir / filename

        # Convert to vector and save temporarily
        logger.info("Converting raster to vector...")
        final_flood_area = raster_to_vector(
            flood_added["flood_results"], ee_rectangle)

        if not final_flood_area.get("features"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No flood areas detected"
            )

        # Create GeoDataFrame with explicit CRS to avoid NumPy 2.0 compatibility issues
        final_flood_area_gpd = gpd.GeoDataFrame.from_features(
            final_flood_area["features"],
            crs="EPSG:4326"
        )
        flood_only = final_flood_area_gpd[final_flood_area_gpd.label == 1].copy(
        )

        if flood_only.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No flood areas detected after filtering"
            )

        # Save temporarily to file for database storage
        flood_only.to_file(str(output_path), driver="GPKG")
        logger.info(f"Temporarily saved flood data to {output_path}")

        # Calculate processing time
        processing_time = time.time() - start_time

        # Save to database
        saved_detection = save_flood_detection(
            db=db,
            bbox=request.bbox,
            baseline_start=baseline_start,
            baseline_end=baseline_end,
            flood_start=flood_start,
            flood_end=flood_end,
            polarization="VV",  # Default from frontend
            threshold=request.flood_threshold,
            detection_results=flood_added,
            geopackage_path=str(output_path),
            geojson_data=final_flood_area,
            processing_time=processing_time,
            user_id=None  # TODO: Add user authentication
        )
        logger.info(f"Saved to database with ID: {saved_detection.id}")

        # Clean up temporary file
        try:
            output_path.unlink()
            logger.info(f"Removed temporary file: {output_path}")
        except Exception as e:
            logger.warning(f"Could not remove temporary file: {e}")

        # Return detection information (not the file)
        return {
            "detection_id": saved_detection.id,
            "status": saved_detection.status,
            "confidence": saved_detection.confidence,
            "classification": saved_detection.classification,
            "flood_area_hectares": saved_detection.flood_area_hectares,
            "flood_percentage": saved_detection.flood_percentage,
            "flood_patches": saved_detection.flood_patches,
            "processing_time_seconds": saved_detection.processing_time_seconds,
            "created_at": saved_detection.created_at.isoformat(),
            "message": f"Flood detection saved to database. Use detection_id={saved_detection.id} to download."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in flood_detect: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Flood detection failed: {str(e)}"
        )

# Backward compatibility endpoint (redirects to new flow)


@app.post("/flood_download", tags=["Flood Detection"])
async def flood_download_legacy(request: FloodDetectionRequest, db: Session = Depends(get_db)):
    """Legacy endpoint - redirects to flood_detect for backward compatibility."""
    logger.warning(
        "Using legacy /flood_download endpoint. Please update to use /flood_detect instead.")
    return await flood_detect(request, db)


@app.get("/flood_download/{detection_id}", tags=["Flood Detection"])
async def flood_download(detection_id: int, db: Session = Depends(get_db)):
    """Download flood detection geopackage from database by ID."""
    try:
        # Import the function to get detection
        from src.database import get_detection_by_id

        # Retrieve detection from database
        detection = get_detection_by_id(db, detection_id)

        if not detection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Flood detection with ID {detection_id} not found"
            )

        if not detection.geopackage_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No geopackage data found for detection ID {detection_id}"
            )

        # Create temporary file from database binary data
        timestamp = detection.created_at.strftime("%Y%m%d%H%M%S")
        filename = f'flood_area_{timestamp}.gpkg'
        temp_path = output_dir / filename

        # Write binary data to file
        with open(temp_path, 'wb') as f:
            f.write(detection.geopackage_data)

        logger.info(f"Downloaded detection ID {detection_id} from database")

        # Return file and clean up after sending
        return FileResponse(
            path=str(temp_path),
            filename=filename,
            media_type="application/geopackage+sqlite3",
            background=lambda: temp_path.unlink() if temp_path.exists() else None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading from database: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Download failed: {str(e)}"
        )


@app.get("/flood_detections", tags=["Flood Detection"])
async def list_flood_detections(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List all flood detections stored in database."""
    try:
        from sqlalchemy import desc
        from src.database import SARFloodDetection

        # Query detections ordered by most recent
        detections = db.query(SARFloodDetection)\
            .order_by(desc(SARFloodDetection.created_at))\
            .offset(skip)\
            .limit(limit)\
            .all()

        # Return summary without binary data
        results = []
        for d in detections:
            results.append({
                "detection_id": d.id,
                "bbox": d.bbox,
                "baseline_period": f"{d.baseline_start.date()} to {d.baseline_end.date()}",
                "flood_period": f"{d.flood_start.date()} to {d.flood_end.date()}",
                "status": d.status,
                "confidence": d.confidence,
                "classification": d.classification,
                "flood_area_hectares": d.flood_area_hectares,
                "flood_percentage": d.flood_percentage,
                "flood_patches": d.flood_patches,
                "threshold": d.threshold,
                "polarization": d.polarization,
                "processing_time_seconds": d.processing_time_seconds,
                "created_at": d.created_at.isoformat(),
                "has_geopackage": d.geopackage_data is not None,
                "geopackage_size_kb": len(d.geopackage_data) / 1024 if d.geopackage_data else 0
            })

        return {
            "total": len(results),
            "skip": skip,
            "limit": limit,
            "detections": results
        }

    except Exception as e:
        logger.error(f"Error listing detections: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list detections: {str(e)}"
        )


@app.post("/flood_display", response_model=FloodDetectionResponse, tags=["Flood Detection"])
async def flood_display(request: FloodDetectionRequest):
    """Display flood detection results as map tiles."""
    if not gee_initialized:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google Earth Engine not authenticated. Please authenticate first."
        )

    try:
        # Parse bbox
        xmin, ymin, xmax, ymax = [float(x) for x in request.bbox.split(",")]
        ee_rectangle = ee.Geometry.Rectangle([xmin, ymin, xmax, ymax])

        # Create date ranges
        base_period = (request.init_start, request.init_last)
        flood_period = (request.flood_start, request.flood_last)

        # Run flood detection
        logger.info(f"========== FLOOD DETECTION START ==========")
        logger.info(f"Baseline period: {base_period[0]} to {base_period[1]}")
        logger.info(f"Flood period: {flood_period[0]} to {flood_period[1]}")
        logger.info(f"Bbox: {request.bbox}")
        logger.info(f"Threshold: {request.flood_threshold}")

        dict_db = db_creator(base_period, flood_period, ee_rectangle)
        logger.info(
            f"Images collected - Before count: {dict_db.get('before_count')}, After count: {dict_db.get('after_count')}")

        # Check if image collection failed
        if dict_db.get("status") in ["no_baseline_images", "no_flood_images"]:
            logger.warning(f"Image collection issue: {dict_db.get('status')}")
            return FloodDetectionResponse(
                before_tile="",
                after_tile="",
                flood_tile="",
                permanent_water_tile="",
                high_slope_tile="",
                flood_area_ha=0.0,
                confidence=0.0,
                flood_patches=0,
                status=dict_db.get("status"),
                message=dict_db.get("message"),
                metadata={
                    "base_period": f"{request.init_start} to {request.init_last}",
                    "flood_period": f"{request.flood_start} to {request.flood_last}",
                    "threshold": request.flood_threshold,
                    "bbox": request.bbox
                }
            )

        flood_added = flood_estimation(
            dict_db, difference_threshold=request.flood_threshold)
        logger.info(f"========== FLOOD DETECTION COMPLETE ==========")

        # Check detection status
        detection_status = flood_added.get("status", "unknown")
        detection_message = flood_added.get("message", "Detection completed")

        # Generate tile URLs (even for no-flood cases, show before/after imagery)
        tileids = display(flood_added)

        # Extract numeric flood area for frontend display
        area_stats = flood_added.get("flood_area_stats") or {}
        area_ha = area_stats.get("area_hectares") if isinstance(
            area_stats, dict) else 0.0
        confidence = area_stats.get("mean_confidence", 0.0) if isinstance(
            area_stats, dict) else 0.0
        flood_patches = area_stats.get(
            "flood_patches", 0) if isinstance(area_stats, dict) else 0

        return FloodDetectionResponse(
            before_tile=tileids.get("before_flood", ""),
            after_tile=tileids.get("after_flood", ""),
            flood_tile=tileids.get("flood_results", ""),
            permanent_water_tile=tileids.get("permanent_water", ""),
            high_slope_tile=tileids.get("high_slope", ""),
            flood_area_ha=area_ha,
            confidence=confidence,
            flood_patches=flood_patches,
            status=detection_status,
            message=detection_message,
            metadata={
                "base_period": f"{request.init_start} to {request.init_last}",
                "flood_period": f"{request.flood_start} to {request.flood_last}",
                "threshold": request.flood_threshold,
                "bbox": request.bbox
            }
        )

    except Exception as e:
        logger.error(f"Error in flood_display: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Flood detection failed: {str(e)}"
        )


@app.post("/extract-features", tags=["Feature Extraction"])
async def extract_features(request: FeatureExtractionRequest):
    """
    Extract satellite-derived features for flood prediction.

    Returns environmental features from Google Earth Engine:
    - SAR backscatter (VV, VH polarizations)
    - Precipitation
    - Elevation
    - Water occurrence

    Note: If GEE connection times out, returns estimated default values
    """
    if not gee_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Earth Engine not initialized"
        )

    try:
        from datetime import datetime, timedelta
        import socket

        # Create point geometry
        point = ee.Geometry.Point([request.longitude, request.latitude])
        region = point.buffer(request.buffer_km * 1000)  # Convert km to meters

        # Date range (last 30 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)

        # Set socket timeout to prevent hanging
        socket.setdefaulttimeout(15.0)

        # SAR data (Sentinel-1) with timeout handling
        try:
            sar = ee.ImageCollection('COPERNICUS/S1_GRD') \
                .filterBounds(region) \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .filter(ee.Filter.eq('instrumentMode', 'IW'))

            sar_vv = sar.select('VV').mean().reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', True)
                        .combine(ee.Reducer.min(), '', True)
                        .combine(ee.Reducer.max(), '', True),
                geometry=region,
                scale=100,
                maxPixels=1e9
            ).getInfo()

            sar_vh = sar.select('VH').mean().reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', True)
                        .combine(ee.Reducer.min(), '', True)
                        .combine(ee.Reducer.max(), '', True),
                geometry=region,
                scale=100,
                maxPixels=1e9
            ).getInfo()
        except (socket.timeout, Exception) as e:
            logger.error(f"SAR data fetch failed: {e}")
            raise HTTPException(
                status_code=503, detail=f"Failed to fetch SAR data from Google Earth Engine: {str(e)}")

        # Precipitation (CHIRPS) with timeout handling
        try:
            precip_collection = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY') \
                .filterBounds(region) \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))

            precip_sum = precip_collection.sum().reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=5000,
                maxPixels=1e9
            ).getInfo()

            precip_mean = precip_collection.mean().reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=5000,
                maxPixels=1e9
            ).getInfo()

            precip_max = precip_collection.max().reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=5000,
                maxPixels=1e9
            ).getInfo()
        except (socket.timeout, Exception) as e:
            logger.error(f"Precipitation data fetch failed: {e}")
            raise HTTPException(
                status_code=503, detail=f"Failed to fetch precipitation data from Google Earth Engine: {str(e)}")

        # Elevation (SRTM) with timeout handling
        try:
            elevation = ee.Image('USGS/SRTMGL1_003').select('elevation') \
                .reduceRegion(
                    reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', True),
                    geometry=region,
                    scale=90,
                    maxPixels=1e9
            ).getInfo()
            slope = ee.Terrain.slope(ee.Image('USGS/SRTMGL1_003')) \
                .reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=region,
                    scale=90,
                    maxPixels=1e9
            ).getInfo()
        except (socket.timeout, Exception) as e:
            logger.error(f"Elevation data fetch failed: {e}")
            raise HTTPException(
                status_code=503, detail=f"Failed to fetch elevation data from Google Earth Engine: {str(e)}")

        # Water occurrence (JRC) with timeout handling
        try:
            water = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence') \
                .reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=region,
                    scale=30,
                    maxPixels=1e9
            ).getInfo()
        except (socket.timeout, Exception) as e:
            logger.error(f"Water occurrence data fetch failed: {e}")
            raise HTTPException(
                status_code=503, detail=f"Failed to fetch water occurrence data from Google Earth Engine: {str(e)}")

        # Return features
        features = {
            "sar_vv": {
                "mean": sar_vv.get('VV_mean', 0),
                "std": sar_vv.get('VV_stdDev', 0),
                "min": sar_vv.get('VV_min', 0),
                "max": sar_vv.get('VV_max', 0),
                "stdDev_mean": sar_vv.get('VV_stdDev', 0)
            },
            "sar_vh": {
                "mean": sar_vh.get('VH_mean', 0),
                "std": sar_vh.get('VH_stdDev', 0),
                "min": sar_vh.get('VH_min', 0),
                "max": sar_vh.get('VH_max', 0),
                "stdDev_mean": sar_vh.get('VH_stdDev', 0)
            },
            "precipitation": {
                "sum": precip_sum.get('precipitation', 0),
                "mean": precip_mean.get('precipitation', 0),
                "max": precip_max.get('precipitation', 0)
            },
            "elevation": {
                "mean": elevation.get('elevation_mean', 0),
                "std": elevation.get('elevation_stdDev', 0),
                "slope_mean": slope.get('slope', 0)
            },
            "water_occurrence": {
                "mean": water.get('occurrence', 0)
            }
        }

        logger.info(
            f"Extracted features for ({request.latitude}, {request.longitude})")
        return {"features": features, "location": {"latitude": request.latitude, "longitude": request.longitude}}

    except Exception as e:
        logger.error(f"Feature extraction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Feature extraction failed: {str(e)}"
        )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error occurred"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
        log_level="info"
    )

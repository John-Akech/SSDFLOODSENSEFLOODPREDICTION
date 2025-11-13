from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field, field_validator
import uvicorn
import ee
import os
import time
import logging
from pathlib import Path
from typing import Optional
import geopandas as gpd

from src.utils import raster_to_vector
from src.model import db_creator, flood_estimation, display
from src.config import settings

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
    project_id = os.getenv('GEE_PROJECT_ID', 'ace-connection-474712-p1')
    service_account_file = os.getenv('GEE_SERVICE_ACCOUNT_KEY', '/app/gee-service-account-key.json')
    
    # Check if service account key exists
    if os.path.exists(service_account_file):
        logger.info(f"[INFO] Using service account authentication: {service_account_file}")
        logger.info(f"[INFO] Project ID: {project_id}")
        
        # Read service account credentials
        with open(service_account_file, 'r') as f:
            import json
            service_account_info = json.load(f)
            service_account_email = service_account_info.get('client_email', 'unknown')
        
        logger.info(f"[INFO] Service account email: {service_account_email}")
        
        # Initialize with service account
        credentials = ee.ServiceAccountCredentials(service_account_email, service_account_file)
        ee.Initialize(credentials, project=project_id)
        
        logger.info(f"[OK] Earth Engine initialized successfully with service account")
        logger.info(f"[OK] Project: {project_id}")
        gee_initialized = True
        
    else:
        # Fallback to default credentials (for local development)
        logger.warning(f"[WARN] Service account key not found at: {service_account_file}")
        logger.info("[INFO] Attempting Earth Engine initialization with default credentials...")
        
        if project_id:
            ee.Initialize(project=project_id)
            logger.info(f"[OK] Earth Engine initialized with default credentials and project: {project_id}")
        else:
            ee.Initialize()
            logger.info("[OK] Earth Engine initialized with default credentials (no project)")
        
        gee_initialized = True
        
except Exception as e:
    gee_error = str(e)
    logger.error(f"[ERROR] Earth Engine initialization failed: {e}")
    logger.error("[ERROR] Please ensure:")
    logger.error("  1. Service account key file exists at /app/gee-service-account-key.json")
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
    init_start: str = Field(..., description="Base period start date (YYYY-MM-DD)")
    init_last: str = Field(..., description="Base period end date (YYYY-MM-DD)")
    flood_start: str = Field(..., description="Flood period start date (YYYY-MM-DD)")
    flood_last: str = Field(..., description="Flood period end date (YYYY-MM-DD)")
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
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "FloodSense SAR Detection",
        "version": "2.0.0",
        "gee_initialized": gee_initialized,
        "gee_error": gee_error if not gee_initialized else None,
        "project": "BSc. Software Engineering - John Akech"
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
            latest_date = ee.Date(latest_image.get("system:time_start")).format("YYYY-MM-dd").getInfo()
            
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
        logger.info(f"[OK] Earth Engine initialized with project: {project_id or 'default'}")
        
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

@app.post("/flood_download", tags=["Flood Detection"])
async def flood_download(request: FloodDetectionRequest):
    """Download flood detection results as GeoPackage."""
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
        logger.info(f"Processing flood detection for bbox: {request.bbox}")
        dict_db = db_creator(base_period, flood_period, ee_rectangle)
        flood_added = flood_estimation(dict_db, difference_threshold=request.flood_threshold)
        
        # Generate output filename
        timestamp = time.strftime("%Y%m%d%H%M%S", time.gmtime())
        filename = f'flood_area_{timestamp}.gpkg'
        output_path = output_dir / filename
        
        # Convert to vector and save
        logger.info("Converting raster to vector...")
        final_flood_area = raster_to_vector(flood_added["flood_results"], ee_rectangle)
        
        if not final_flood_area.get("features"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No flood areas detected"
            )
        
        final_flood_area_gpd = gpd.GeoDataFrame.from_features(final_flood_area["features"])
        flood_only = final_flood_area_gpd[final_flood_area_gpd.label == 1]
        
        if flood_only.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No flood areas detected after filtering"
            )
        
        flood_only.to_file(str(output_path), driver="GPKG")
        logger.info(f"Saved flood data to {output_path}")
        
        return FileResponse(
            path=str(output_path),
            filename=filename,
            media_type="application/geopackage+sqlite3"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in flood_download: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Flood detection failed: {str(e)}"
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
        logger.info(f"Images collected - Before count: {dict_db.get('before_count')}, After count: {dict_db.get('after_count')}")
        
        flood_added = flood_estimation(dict_db, difference_threshold=request.flood_threshold)
        logger.info(f"========== FLOOD DETECTION COMPLETE ==========")
        
        # Generate tile URLs
        tileids = display(flood_added)
        
        # Extract numeric flood area for frontend display
        area_stats = flood_added.get("flood_area_stats") or {}
        area_ha = area_stats.get("area_hectares") if isinstance(area_stats, dict) else None
        confidence = area_stats.get("mean_confidence", 0.0) if isinstance(area_stats, dict) else 0.0
        flood_patches = area_stats.get("flood_patches", 0) if isinstance(area_stats, dict) else 0

        return FloodDetectionResponse(
            before_tile=tileids.get("before_flood", ""),
            after_tile=tileids.get("after_flood", ""),
            flood_tile=tileids.get("flood_results", ""),
            permanent_water_tile=tileids.get("permanent_water", ""),
            high_slope_tile=tileids.get("high_slope", ""),
            flood_area_ha=area_ha,
            confidence=confidence,
            flood_patches=flood_patches,
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
            raise HTTPException(status_code=503, detail=f"Failed to fetch SAR data from Google Earth Engine: {str(e)}")
        
        # Precipitation (CHIRPS) with timeout handling
        try:
            precip = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY') \
                .filterBounds(region) \
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
                .sum() \
                .reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=region,
                    scale=5000,
                    maxPixels=1e9
                ).getInfo()
        except (socket.timeout, Exception) as e:
            logger.error(f"Precipitation data fetch failed: {e}")
            raise HTTPException(status_code=503, detail=f"Failed to fetch precipitation data from Google Earth Engine: {str(e)}")
        
        # Elevation (SRTM) with timeout handling
        try:
            elevation = ee.Image('USGS/SRTMGL1_003').select('elevation') \
                .reduceRegion(
                    reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', True),
                    geometry=region,
                    scale=90,
                    maxPixels=1e9
                ).getInfo()
        except (socket.timeout, Exception) as e:
            logger.error(f"Elevation data fetch failed: {e}")
            raise HTTPException(status_code=503, detail=f"Failed to fetch elevation data from Google Earth Engine: {str(e)}")
        
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
            raise HTTPException(status_code=503, detail=f"Failed to fetch water occurrence data from Google Earth Engine: {str(e)}")
        
        # Return features
        features = {
            "sar_vv": {
                "mean": sar_vv.get('VV_mean', 0),
                "std": sar_vv.get('VV_stdDev', 0),
                "min": sar_vv.get('VV_min', 0),
                "max": sar_vv.get('VV_max', 0)
            },
            "sar_vh": {
                "mean": sar_vh.get('VH_mean', 0),
                "std": sar_vh.get('VH_stdDev', 0),
                "min": sar_vh.get('VH_min', 0),
                "max": sar_vh.get('VH_max', 0)
            },
            "precipitation": {
                "sum_30d": precip.get('precipitation', 0)
            },
            "elevation": {
                "mean": elevation.get('elevation_mean', 0),
                "std": elevation.get('elevation_stdDev', 0)
            },
            "water_occurrence": {
                "mean": water.get('occurrence', 0)
            }
        }
        
        logger.info(f"Extracted features for ({request.latitude}, {request.longitude})")
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
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
    import json
    service_account_file = os.path.join(os.path.dirname(__file__), 'gee-service-account.json')
    
    # Try service account first (for production)
    if os.path.exists(service_account_file):
        try:
            with open(service_account_file, 'r') as f:
                key_data = json.load(f)
            service_account = key_data['client_email']
            project_id = key_data.get('project_id')
            credentials = ee.ServiceAccountCredentials(service_account, service_account_file)
            ee.Initialize(credentials, project=project_id)
            logger.info(f"[OK] Earth Engine initialized with service account (project: {project_id})")
            gee_initialized = True
        except Exception as sa_error:
            logger.warning(f"[WARN] Service account failed: {sa_error}")
            # Fallback to personal auth
            try:
                ee.Initialize()
                logger.info("[OK] Earth Engine initialized with personal auth (fallback)")
                gee_initialized = True
            except Exception as fallback_error:
                logger.error(f"[ERROR] Personal auth also failed: {fallback_error}")
                gee_error = f"Service account: {sa_error}. Personal auth: {fallback_error}"
                gee_initialized = False
    else:
        # No service account file, use personal auth
        ee.Initialize()
        logger.info("[OK] Earth Engine initialized with personal auth")
        gee_initialized = True
except Exception as e:
    gee_error = str(e)
    logger.warning(f"[WARN] Earth Engine not initialized: {e}")
    logger.info("Run 'earthengine authenticate' in terminal first")
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
    flood_area_ha: Optional[float] = None
    metadata: dict

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
        logger.info(f"✓ Earth Engine initialized with project: {project_id or 'default'}")
        
        return {
            "success": True,
            "message": "Earth Engine authenticated successfully",
            "project_id": project_id
        }
    except Exception as e:
        gee_error = str(e)
        logger.error(f"✗ Authentication failed: {e}")
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
        logger.info(f"Displaying flood detection for bbox: {request.bbox}")
        dict_db = db_creator(base_period, flood_period, ee_rectangle)
        flood_added = flood_estimation(dict_db, difference_threshold=request.flood_threshold)
        
        # Generate tile URLs
        tileids = display(flood_added)
        
        # Extract numeric flood area for frontend display
        area_stats = flood_added.get("flood_area_stats") or {}
        area_ha = area_stats.get("area_hectares") if isinstance(area_stats, dict) else None

        return FloodDetectionResponse(
            before_tile=tileids.get("before_flood", ""),
            after_tile=tileids.get("after_flood", ""),
            flood_tile=tileids.get("flood_results", ""),
            flood_area_ha=area_ha,
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
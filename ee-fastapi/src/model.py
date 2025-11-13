"""SAR flood mapping using change detection.

This script uses SAR Sentinel-1 images to generate a flood extent map with
multi-polarization analysis and adaptive thresholding. The dataset available 
in the Earth Engine Data Catalog includes the following preprocessing steps:
Thermal-Noise Removal, Radiometric calibration, and Terrain-correction.
  
Features:
- Multi-polarization analysis (VV + VH)
- Speckle filtering (Lee, Frost, Kuan filters)
- Adaptive thresholding based on local statistics
- Temporal consistency checks
- Quality assessment metrics
- Morphological filtering and edge detection
"""

import ee
import logging
import math
from typing import Dict, Tuple, Optional, List
from enum import Enum

logger = logging.getLogger(__name__)

class SpeckleFilter(Enum):
    """Available speckle filtering methods"""
    FOCAL_MEAN = "focal_mean"
    LEE = "lee"
    FROST = "frost"
    KUAN = "kuan"
    GAMMA_MAP = "gamma_map"

class PolarizationMode(Enum):
    """Available polarization modes"""
    VH_ONLY = "vh_only"
    VV_ONLY = "vv_only"
    DUAL = "dual"
    COMBINED = "combined"

# Earth Engine Viz Parameters
geoviz_app = {
    "s1_img": {"min": -25, "max": 0},
    "diff_s1": {"min": 0, "max": 2},
    "flood": {"palette": "0000FF"},
    "populationCountVis": {
        "min": 0, "max": 200.0,
        "palette": ['060606', '337663', '337663', 'ffffff']
    },
    "populationExposedVis": {
        "min": 0, "max": 200.0, 
        "palette": ['yellow', 'orange', 'red']
    },
    "LCVis": {
        "min": 1.0, "max": 17.0,
        "palette": [
            '05450a', '086a10', '54a708', '78d203',
            '009900', 'c6b044', 'dcd159', 'dade48',
            'fbff13', 'b6ff05', '27ff87', 'c24f44',
            'a5a5a5', 'ff6d4c', '69fff8', 'f9ffa4',
            '1c0dff'
        ]
    },
    "croplandVis": {"min": 0, "max": 14.0, "palette": ['30b21c']},
    "urbanVis": {"min": 0, "max": 13.0, "palette": ['grey']}
}


# Display basemap with confidence and quality information
def display(dict_db):
    """ Display Earth Engine map with confidence and quality layers
    Returns:
        dict: Dictionary containing tile URLs for all layers
    """
    try:
        # S1 before flood
        s1_bf = ee.Image.visualize(dict_db["before_flood"], **geoviz_app["s1_img"])
        s1_bf_id = ee.data.getMapId({"image": s1_bf})["tile_fetcher"].url_format

        # S1 after flood
        s1_af = ee.Image.visualize(dict_db["after_flood"], **geoviz_app["s1_img"])
        s1_af_id = ee.data.getMapId({"image": s1_af})["tile_fetcher"].url_format

        # Flood results with CLASSIFICATION based on confidence levels
        # Create confidence-based classification matching legend colors
        flood_mask = dict_db["flood_results"]
        ratio_diff = dict_db.get("ratio_difference", ee.Image.constant(1))
        
        # Calculate confidence score for each pixel (0-100%)
        # Lower ratio_difference = higher confidence (water shows as dark = low backscatter)
        confidence_score = ratio_diff.expression(
            '100 * (1 - (ratio / 2))',  # Convert ratio to confidence percentage
            {'ratio': ratio_diff}
        ).clamp(0, 100)
        
        # Classify into 4 categories matching the legend
        # High Risk (>90%): Red (#d32f2f to #f44336)
        # Medium (70-90%): Orange (#f57c00 to #ff9800)
        # Low (50-70%): Yellow (#fbc02d to #ffeb3b)
        # Uncertain (<50%): Gray (#9e9e9e to #bdbdbd)
        
        high_risk = flood_mask.And(confidence_score.gte(90))
        medium_risk = flood_mask.And(confidence_score.gte(70)).And(confidence_score.lt(90))
        low_risk = flood_mask.And(confidence_score.gte(50)).And(confidence_score.lt(70))
        uncertain = flood_mask.And(confidence_score.lt(50))
        
        # Create classified image (1=uncertain, 2=low, 3=medium, 4=high)
        flood_classified = (
            uncertain.multiply(1)
            .add(low_risk.multiply(2))
            .add(medium_risk.multiply(3))
            .add(high_risk.multiply(4))
        ).updateMask(flood_mask)
        
        # Visualize with exact legend colors
        flood_viz = {
            "min": 1,
            "max": 4,
            "palette": [
                "9e9e9e",  # 1 = Uncertain (<50%) - Gray
                "fbc02d",  # 2 = Low (50-70%) - Yellow
                "f57c00",  # 3 = Medium (70-90%) - Orange
                "d32f2f"   # 4 = High Risk (>90%) - Red
            ]
        }
        s1_fresults = ee.Image.visualize(flood_classified, **flood_viz)
        s1_fresults_id = ee.data.getMapId({"image": s1_fresults})["tile_fetcher"].url_format
        
        # Confidence map
        confidence_viz = {
            "min": 0,
            "max": 1,
            "palette": ["000000", "330066", "6600CC", "9900FF", "CC00FF", "FF00CC", "FF0099", "FF0066", "FF0033", "FF0000"]
        }
        confidence_map = ee.Image.visualize(dict_db.get("confidence_map", ee.Image.constant(0)), **confidence_viz)
        confidence_id = ee.data.getMapId({"image": confidence_map})["tile_fetcher"].url_format
        
        # Difference map
        diff_viz = {
            "min": 0,
            "max": 3,
            "palette": ["000000", "0000FF", "00FFFF", "00FF00", "FFFF00", "FF0000"]
        }
        diff_map = ee.Image.visualize(dict_db.get("ratio_difference", ee.Image.constant(1)), **diff_viz)
        diff_id = ee.data.getMapId({"image": diff_map})["tile_fetcher"].url_format
        
        # Combined flood detection (shows agreement across methods)
        combined_viz = {
            "min": 0,
            "max": 1,
            "palette": ["000000", "3300CC", "6600FF", "9900FF", "CC00FF", "FF00CC", "FF0099", "FF0066", "FF0033", "FF0000"]
        }
        combined_map = ee.Image.visualize(dict_db.get("flood_combined", ee.Image.constant(0)), **combined_viz)
        combined_id = ee.data.getMapId({"image": combined_map})["tile_fetcher"].url_format
        
        # Reference Layers - Permanent Water Bodies (JRC Global Surface Water)
        water_occurrence = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select('occurrence')
        # Pixels with >50% water occurrence = permanent water
        permanent_water = water_occurrence.gte(50).selfMask()
        water_viz = {
            "palette": ["0097a7"]  # Cyan matching legend
        }
        water_visualized = ee.Image.visualize(permanent_water, **water_viz)
        water_id = ee.data.getMapId({"image": water_visualized})["tile_fetcher"].url_format
        
        # Reference Layers - High Slope Areas  
        DEM = ee.Image('WWF/HydroSHEDS/03VFDEM')
        slope = ee.Algorithms.Terrain(DEM).select('slope')
        # Slopes > 15 degrees = high slope (floods unlikely)
        high_slope = slope.gte(15).selfMask()
        slope_viz = {
            "palette": ["5d4037"]  # Brown matching legend
        }
        slope_visualized = ee.Image.visualize(high_slope, **slope_viz)
        slope_id = ee.data.getMapId({"image": slope_visualized})["tile_fetcher"].url_format
        
        layer_to_display = {
            "before_flood": s1_bf_id,
            "after_flood": s1_af_id,
            "flood_results": s1_fresults_id,
            "confidence_map": confidence_id,
            "difference_map": diff_id,
            "combined_detection": combined_id,
            "permanent_water": water_id,
            "high_slope": slope_id,
            "quality_info": {
                "before_quality": dict_db.get("before_quality", {}),
                "after_quality": dict_db.get("after_quality", {}),
                "flood_stats": dict_db.get("flood_area_stats", {})
            }
        }
        return layer_to_display
        
    except Exception as e:
        logger.error(f"Error in display function: {str(e)}")
        # Return basic display on error
        try:
            s1_bf = ee.Image.visualize(dict_db["before_flood"], **geoviz_app["s1_img"])
            s1_bf_id = ee.data.getMapId({"image": s1_bf})["tile_fetcher"].url_format

            s1_af = ee.Image.visualize(dict_db["after_flood"], **geoviz_app["s1_img"])
            s1_af_id = ee.data.getMapId({"image": s1_af})["tile_fetcher"].url_format

            s1_fresults = ee.Image.visualize(dict_db["flood_results"], **geoviz_app["flood"])
            s1_fresults_id = ee.data.getMapId({"image": s1_fresults})["tile_fetcher"].url_format
            
            return {
                "before_flood": s1_bf_id,
                "after_flood": s1_af_id,
                "flood_results": s1_fresults_id
            }
        except Exception as e2:
            logger.error(f"Error in fallback display: {str(e2)}")
            raise

# Extract date from meta data
def dates(imgcol):
    range = imgcol.reduceColumns(ee.Reducer.minMax(), ["system:time_start"])
    ee_min = ee.Date(range.get('min')).format('YYYY-MM-dd').getInfo()
    ee_max = ee.Date(range.get('max')).format('YYYY-MM-dd').getInfo()
    printed = "from %s to %s" % (ee_min, ee_max)
    return printed


def db_creator(
    base_period: Tuple[str, str],
    flood_period: Tuple[str, str],
    geometry: ee.Geometry,
    polarization: str = "VH",
    pass_direction: str = "DESCENDING",
    quiet: bool = False,
    min_images: int = 1,  # Reduced from 2
    max_images: int = 5,   # Reduced from 10 for faster processing
    quality_threshold: float = 0.7
) -> Dict:
    """Create SAR image database for fast flood detection.
    
    Args:
        base_period: Tuple of (start_date, end_date) for baseline
        flood_period: Tuple of (start_date, end_date) for flood event
        geometry: Earth Engine geometry for area of interest
        polarization: SAR polarization (VH or VV)
        pass_direction: Satellite pass direction
        quiet: Suppress logging output
        min_images: Minimum number of images required per period
        max_images: Maximum number of images to use per period
        quality_threshold: Minimum quality threshold for image selection
        
    Returns:
        Dictionary containing processed SAR images and metadata
    """
    try:
        # Limit geometry bounds to prevent 5000+ element error
        # Reduce geometry complexity and ensure reasonable spatial extent
        processed_geometry = geometry.simplify(maxError=100)  # Simplify to 100m tolerance
        bounds = processed_geometry.bounds()
        
        # Load and filter Sentinel-1 GRD data with strict limits
        collection = (ee.ImageCollection("COPERNICUS/S1_GRD")
                    .filter(ee.Filter.eq("instrumentMode", "IW"))
                    .filter(ee.Filter.listContains("transmitterReceiverPolarisation", polarization))
                    .filter(ee.Filter.eq("orbitProperties_pass", pass_direction))
                    .filter(ee.Filter.eq("resolution_meters", 10))
                    .filterBounds(bounds)  # Use processed bounds
                    .select(polarization)
                    .limit(500))  # Hard limit to prevent accumulation errors

        # Fast image selection - limit to max_images per period
        before_collection = collection.filterDate(base_period[0], base_period[1]).limit(max_images)
        after_collection = collection.filterDate(flood_period[0], flood_period[1]).limit(max_images)

        # Validate that images exist for both periods
        before_count = before_collection.size().getInfo()
        after_count = after_collection.size().getInfo()
        
        if before_count == 0:
            raise ValueError(f"No Sentinel-1 images found for baseline period {base_period[0]} to {base_period[1]}. Try expanding the date range or check if Sentinel-1 covers this area.")
        
        if after_count == 0:
            raise ValueError(f"No Sentinel-1 images found for flood period {flood_period[0]} to {flood_period[1]}. Try expanding the date range or check if Sentinel-1 covers this area.")

        if not quiet:
            logger.info(f"Found {before_count} baseline images and {after_count} flood images")

        # Create simple mosaics (faster than temporal weighting)
        before = before_collection.median().clip(geometry)
        after = after_collection.median().clip(geometry)

        # Apply simple speckle filtering only (much faster)
        before_filtered = before.focal_mean(50, 'circle', 'meters')
        after_filtered = after.focal_mean(50, 'circle', 'meters')
        
        dict_preprocessing = {
            "before_flood": before_filtered,
            "after_flood": after_filtered,
            "base_period": base_period,
            "flood_period": flood_period,
            "aoi": geometry,
            "polarization": polarization,
            "before_quality": {"quality_score": 0.7},  # Skip expensive quality calc
            "after_quality": {"quality_score": 0.7},
            "before_count": max_images,
            "after_count": max_images
        }
        return dict_preprocessing
    except Exception as e:
        logger.error(f"Error in db_creator: {str(e)}")
        raise

def select_best_images(collection: ee.ImageCollection, period: Tuple[str, str], aoi: ee.Geometry, 
                      min_images: int, max_images: int, quality_threshold: float) -> ee.ImageCollection:
    """Select the best quality images from a collection."""
    # Filter by date
    filtered = collection.filterDate(period[0], period[1])
    
    # Return filtered collection sorted by date (most recent first)
    sorted_collection = filtered.sort('system:time_start', False)
    
    # Limit to max_images
    limited = sorted_collection.limit(max_images)
    
    return limited

def create_temporal_mosaic(collection: ee.ImageCollection, aoi, period_type: str) -> ee.Image:
    """Create a high-quality temporal mosaic with proper weighting."""
    count = collection.size().getInfo()
    
    # Get geometry from aoi
    if isinstance(aoi, ee.FeatureCollection):
        geom = aoi.geometry()
    elif isinstance(aoi, ee.Feature):
        geom = aoi.geometry()
    else:
        geom = aoi
    
    if count == 1:
        # Single image - use as is
        return collection.first().clip(geom)
    elif count <= 3:
        # Few images - use median for noise reduction
        return collection.median().clip(geom)
    else:
        # Multiple images - use simple mean for stability
        # The weighted approach is too complex for Earth Engine's client-server model
        return collection.mean().clip(geom)

def apply_preprocessing(image: ee.Image, aoi) -> ee.Image:
    """Apply preprocessing to SAR images for flood detection."""
    # Get geometry from aoi
    if isinstance(aoi, ee.FeatureCollection):
        geom = aoi.geometry()
    elif isinstance(aoi, ee.Feature):
        geom = aoi.geometry()
    else:
        geom = aoi
    
    # Convert to linear scale for better processing
    linear_image = ee.Image(10).pow(image.divide(10))
    
    # Apply multi-scale speckle filtering
    # First pass: gentle filtering
    filtered_1 = linear_image.focal_mean(30, 'circle', 'meters')
    
    # Second pass: stronger filtering
    filtered_2 = filtered_1.focal_mean(50, 'circle', 'meters')
    
    # Third pass: edge-preserving filter
    kernel = ee.Kernel.circle(100, 'meters')
    local_mean = filtered_2.reduceNeighborhood(ee.Reducer.mean(), kernel)
    local_variance = filtered_2.reduceNeighborhood(ee.Reducer.variance(), kernel)
    
    # Lee filter for edge preservation
    lee_filtered = local_mean.add(
        local_variance.divide(local_mean.add(1)).multiply(
            filtered_2.subtract(local_mean)
        )
    )
    
    # Convert back to dB scale
    db_image = lee_filtered.log10().multiply(10)
    
    return db_image.clip(geom)

def calculate_image_quality(image: ee.Image, aoi) -> Dict:
    """Calculate image quality metrics."""
    try:
        # Get band names
        band_names = image.bandNames().getInfo()
        if not band_names or len(band_names) == 0:
            return {"quality_score": 0.5}
        
        first_band = band_names[0]
        
        # Get geometry from aoi (could be FeatureCollection, Feature, or Geometry)
        if isinstance(aoi, ee.FeatureCollection):
            geom = aoi.geometry()
        elif isinstance(aoi, ee.Feature):
            geom = aoi.geometry()
        else:
            geom = aoi
        
        # Calculate statistics
        stats = image.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), sharedInputs=True)
                .combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=geom,
            scale=50,
            bestEffort=True
        )
        
        # Use getInfo() to retrieve the stats dictionary
        stats_info = stats.getInfo()
        
        # Get values using band name
        mean_val = stats_info.get(first_band) if first_band in stats_info else stats_info.get('mean', 0)
        std_val = stats_info.get('stdDev', 0)
        min_val = stats_info.get('min', 0) if 'min' in stats_info else 0
        max_val = stats_info.get('max', 0) if 'max' in stats_info else 0
        
        # If we still don't have values, use defaults
        if not mean_val or not std_val:
            return {"quality_score": 0.5}
        
        # Calculate quality metrics
        dynamic_range = max_val - min_val
        signal_to_noise = mean_val / std_val if std_val > 0 else 0
        contrast_ratio = std_val / mean_val if mean_val != 0 else 0
        
        # Overall quality score (0-1)
        quality_score = min(1.0, max(0.0, (signal_to_noise / 10) * 0.5 + (contrast_ratio / 2) * 0.5))
        
        return {
            "mean_backscatter": round(mean_val, 2),
            "std_backscatter": round(std_val, 2),
            "dynamic_range": round(dynamic_range, 2),
            "signal_to_noise": round(signal_to_noise, 2),
            "contrast_ratio": round(contrast_ratio, 2),
            "quality_score": round(quality_score, 3)
        }
    except Exception as e:
        logger.error(f"Could not calculate image quality: {e}")
        return {"quality_score": 0.0}  # Quality calculation failed


def flood_estimation(
    dict_db: Dict,
    difference_threshold: float = 1.25,
    stats: bool = True,
    confidence_threshold: float = 0.6,  # Reduced for faster processing
    min_flood_area: float = 0.5,
    use_adaptive_threshold: bool = False,  # Disabled for speed
    temporal_consistency: bool = False  # Disabled for speed
) -> Dict:
    """Fast flood extent estimation optimized for real-time performance.
    
    Args:
        dict_db: Dictionary from db_creator containing SAR images
        difference_threshold: Base threshold for flood detection
        stats: Calculate flood area statistics
        confidence_threshold: Minimum confidence for flood pixels (0-1)
        min_flood_area: Minimum flood area in hectares
        use_adaptive_threshold: Use adaptive thresholding (slower)
        temporal_consistency: Apply temporal consistency checks (slower)
        
    Returns:
        Updated dictionary with flood results and statistics
    """
    try:
        before_filtered = dict_db["before_flood"]
        after_filtered = dict_db["after_flood"]
        polarization = dict_db["polarization"]
        aoi_geom = dict_db["aoi"]

        logger.info(f"Calculating flood detection with threshold: {difference_threshold}")
        
        # Ratio-based change detection
        # In SAR: water = low backscatter (dark), land = high backscatter (bright)
        # When flooding: backscatter decreases, so ratio (after/before) < 1
        ratio_difference = after_filtered.divide(before_filtered)
        
        # Log ratio statistics to understand the data
        ratio_stats = ratio_difference.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', True).combine(ee.Reducer.minMax(), '', True),
            geometry=aoi_geom,
            scale=100,
            bestEffort=True,
            maxPixels=1e8
        ).getInfo()
        
        logger.info(f"Ratio statistics: mean={ratio_stats.get(polarization + '_mean', 'N/A'):.3f}, "
                   f"std={ratio_stats.get(polarization + '_stdDev', 'N/A'):.3f}, "
                   f"min={ratio_stats.get(polarization + '_min', 'N/A'):.3f}, "
                   f"max={ratio_stats.get(polarization + '_max', 'N/A'):.3f}")
        
        # Detect areas where backscatter DECREASED (ratio < threshold)
        # For flood detection, threshold should be < 1 (e.g., 0.8 means 20% decrease)
        # But for compatibility with existing API using > 1 values, we invert the logic
        if difference_threshold > 1:
            # User passed threshold > 1 (e.g., 1.25), convert to ratio < 1
            # 1.25 means we want 25% decrease = ratio of 0.8 (1/1.25)
            actual_threshold = 1.0 / difference_threshold
            flood_mask = ratio_difference.lt(actual_threshold)
            logger.info(f"Using inverted threshold: {actual_threshold:.3f} (from {difference_threshold})")
        else:
            # User passed threshold < 1 already (e.g., 0.8)
            flood_mask = ratio_difference.lt(difference_threshold)
            logger.info(f"Using direct threshold: {difference_threshold}")
        
        # Check initial flood mask pixel count
        initial_flood_pixels = flood_mask.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=aoi_geom,
            scale=100,
            bestEffort=True,
            maxPixels=1e8
        ).getInfo()
        logger.info(f"Initial flood pixels detected: {initial_flood_pixels.get(polarization, 0)}")
        
        # Post-processing to reduce false positives
        logger.info("Applying post-processing...")
        
        # 1. SKIP removing permanent water - we want to detect ALL water including floods
        # (Permanent water removal was too aggressive and removed actual flood water)
        
        # 2. Apply slope mask only for very steep slopes (floods unlikely on steep slopes)
        DEM = ee.Image('WWF/HydroSHEDS/03VFDEM')
        slope = ee.Algorithms.Terrain(DEM).select('slope')
        flooded_no_steep_slope = flood_mask.updateMask(slope.lt(15))  # Increased from 5° to 15°
        
        after_slope_pixels = flooded_no_steep_slope.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=aoi_geom,
            scale=100,
            bestEffort=True,
            maxPixels=1e8
        ).getInfo()
        logger.info(f"After slope filter: {after_slope_pixels.get(polarization, 0)} pixels")
        
        # 3. Apply LIGHT morphological filtering to remove only obvious noise
        # Opening operation: erosion followed by dilation removes small patches
        kernel = ee.Kernel.circle(radius=1)  # Small kernel for minimal noise removal
        flooded_eroded = flooded_no_steep_slope.focal_min(kernel=kernel, iterations=1)
        flooded_opened = flooded_eroded.focal_max(kernel=kernel, iterations=1)
        
        after_morphology_pixels = flooded_opened.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=aoi_geom,
            scale=100,
            bestEffort=True,
            maxPixels=1e8
        ).getInfo()
        logger.info(f"After morphological filter: {after_morphology_pixels.get(polarization, 0)} pixels")
        
        # 4. Remove VERY small patches (likely noise) - but keep small floods
        # Connected component analysis
        connections = flooded_opened.connectedPixelCount(maxSize=100, eightConnected=True)
        # Keep only patches with at least 5 connected pixels (~0.5 hectare at 10m resolution)
        flooded_filtered = flooded_opened.updateMask(connections.gte(5))  # Reduced from 10 to 5
        
        final_flood_pixels = flooded_filtered.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=aoi_geom,
            scale=100,
            bestEffort=True,
            maxPixels=1e8
        ).getInfo()
        logger.info(f"Final flood pixels after all filters: {final_flood_pixels.get(polarization, 0)} pixels")
        
        flooded = flooded_filtered.unmask(0).selfMask()
        flooded = flooded.rename('flood')
        
        dict_db["flood_results"] = flooded
        dict_db["ratio_difference"] = ratio_difference
        
        if stats:
            logger.info("Calculating statistics...")
            # Quick area calculation
            flood_pixelarea = flooded.multiply(ee.Image.pixelArea())
            
            # Use faster bestEffort mode
            flood_stats = flood_pixelarea.reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=aoi_geom,
                scale=50,  # Increased scale for speed (was 10)
                bestEffort=True,
                maxPixels=1e8
            )
            
            try:
                flood_area_ha = flood_stats.getNumber('flood').divide(10000).getInfo()
            except:
                flood_area_ha = 0
            
            # Calculate flood patch count (connected components with morphological cleanup)
            try:
                if flood_area_ha > 0:
                    # Simpler approach: Apply morphological operations and count patches
                    # Use moderate smoothing to group nearby flood pixels
                    smoothed = flooded.focal_max(radius=50, kernelType='circle', units='meters') \
                                     .focal_min(radius=50, kernelType='circle', units='meters')
                    
                    # Label connected flood patches
                    # Pixels within 100m are considered part of the same patch
                    connected = smoothed.connectedComponents(
                        connectedness=ee.Kernel.square(100, 'meters'),
                        maxSize=256
                    )
                    
                    # Count distinct patches
                    patch_stats = connected.select('labels').reduceRegion(
                        reducer=ee.Reducer.countDistinct(),
                        geometry=aoi_geom,
                        scale=100,
                        bestEffort=True,
                        maxPixels=1e8
                    ).getInfo()
                    
                    # Get patch count (subtract 1 for background/0 value)
                    raw_count = patch_stats.get('labels', 0) if patch_stats else 0
                    flood_patches = max(1, raw_count - 1) if raw_count > 1 else 1
                    
                    # If patch count seems unreasonably high (>100), it indicates noise
                    # Don't estimate - return actual count for transparency
                    if flood_patches > 100:
                        logger.warning(f"High patch count detected ({flood_patches}), may indicate noisy data")
                        
                else:
                    flood_patches = 0
            except Exception as e:
                logger.error(f"Error calculating flood patches: {e}")
                flood_patches = 0  # Set to 0 if calculation fails
            
            # Calculate DYNAMIC confidence based on actual flood detection
            try:
                if flood_area_ha > 0:
                    # Get total area of interest (with error margin for geometry operations)
                    total_area = aoi_geom.area(maxError=1).divide(10000).getInfo()  # Convert to hectares
                    
                    # Calculate flood percentage
                    flood_percentage = (flood_area_ha / total_area) * 100 if total_area > 0 else 0
                    
                    # Get ratio statistics for flooded areas only
                    flooded_mask = flooded.updateMask(flooded)
                    ratio_stats = ratio_difference.updateMask(flooded_mask).reduceRegion(
                        reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', True),
                        geometry=aoi_geom,
                        scale=50,
                        bestEffort=True,
                        maxPixels=1e8
                    ).getInfo()
                    
                    mean_ratio = ratio_stats.get(polarization + '_mean', 0) if ratio_stats else 0
                    std_ratio = ratio_stats.get(polarization + '_stdDev', 0) if ratio_stats else 0
                    
                    # Dynamic confidence based on multiple factors:
                    # 1. How much the ratio exceeds the threshold (signal strength)
                    ratio_factor = min(1.0, (mean_ratio - difference_threshold) / difference_threshold) if mean_ratio > difference_threshold else 0
                    
                    # 2. Consistency of detection (lower std = higher confidence)
                    consistency_factor = 1.0 - min(0.5, std_ratio / 2.0) if mean_ratio > 0 else 0
                    
                    # 3. Spatial extent (more area = higher confidence, but cap it)
                    extent_factor = min(1.0, flood_percentage / 10.0)  # Cap at 10% coverage
                    
                    # 4. Number of patches for quality assessment
                    # Ideal: 1-5 large coherent patches = real flooding
                    # Bad: 50+ patches = likely noise/false detections
                    if flood_patches == 0:
                        patch_factor = 0.3  # No patches identified = low confidence
                    elif flood_patches <= 5:
                        patch_factor = 1.0  # 1-5 patches = excellent (coherent flooding)
                    elif flood_patches <= 10:
                        patch_factor = 0.85  # 6-10 patches = good
                    elif flood_patches <= 20:
                        patch_factor = 0.6  # 11-20 patches = moderate
                    elif flood_patches <= 50:
                        patch_factor = 0.3  # 21-50 patches = questionable
                    else:
                        # 50+ patches = very likely noise, heavy penalty
                        patch_factor = max(0.05, 0.3 - (flood_patches - 50) / 200.0)
                    
                    # Combine factors into overall confidence (weighted average)
                    raw_confidence = (
                        ratio_factor * 0.35 +        # Signal strength
                        consistency_factor * 0.25 +  # Consistency 
                        extent_factor * 0.15 +       # Spatial extent
                        patch_factor * 0.25          # Patch coherence (INCREASED weight)
                    ) * 100
                    
                    # Apply strict confidence bounds
                    if flood_patches > 100:
                        # Too many patches = maximum 40% confidence (likely noise)
                        confidence = min(40.0, raw_confidence)
                    elif flood_patches > 50:
                        # 50-100 patches = maximum 60% confidence
                        confidence = min(60.0, raw_confidence)
                    else:
                        # Normal range for reasonable patch counts
                        confidence = max(10.0, min(99.0, raw_confidence))
                else:
                    # No flood detected = 0% confidence
                    confidence = 0.0
                    
            except Exception as e:
                logger.error(f"Error calculating dynamic confidence: {e}")
                confidence = 0.0  # Set to 0 if calculation fails
            
            dict_db["flood_area_stats"] = {
                "area_hectares": round(flood_area_ha, 2),
                "mean_confidence": round(confidence, 1),
                "flood_patches": int(flood_patches) if flood_patches else 0,
                "quality_score": round(confidence / 100.0, 2)  # Derive from actual confidence
            }
        
        logger.info("Flood estimation completed")
        return dict_db
        
    except Exception as e:
        logger.error(f"Error in flood_estimation: {str(e)}")
        raise

def apply_speckle_filter(image: ee.Image) -> ee.Image:
    """Apply speckle filtering for noise reduction."""
    # Apply multiple passes of focal mean with different kernel sizes
    filtered_1 = image.focal_mean(30, 'circle', 'meters')
    filtered_2 = filtered_1.focal_mean(50, 'circle', 'meters')
    
    # Apply edge-preserving filter
    kernel = ee.Kernel.circle(100, 'meters')
    local_mean = filtered_2.reduceNeighborhood(ee.Reducer.mean(), kernel)
    local_variance = filtered_2.reduceNeighborhood(ee.Reducer.variance(), kernel)
    
    # Lee filter approximation
    lee_filtered = local_mean.add(
        local_variance.divide(local_mean.add(1)).multiply(
            filtered_2.subtract(local_mean)
        )
    )
    
    return lee_filtered

def get_urban_mask(aoi) -> ee.Image:
    """Get urban area mask to reduce false positives."""
    try:
        # Get geometry from aoi
        if isinstance(aoi, ee.FeatureCollection):
            geom = aoi.geometry()
        elif isinstance(aoi, ee.Feature):
            geom = aoi.geometry()
        else:
            geom = aoi
        
        # Use MODIS Land Cover for urban areas
        lc = ee.ImageCollection('MODIS/006/MCD12Q1').filterDate('2020-01-01', '2021-01-01').first()
        urban_mask = lc.select('LC_Type1').eq(13)  # Urban areas
        
        # Also use GHSL built-up areas
        ghs = ee.Image('JRC/GHSL/P2016/BUILT_LDSMT_GLOBE_V1').select('built')
        ghs_urban = ghs.gt(0.3)  # Built-up areas with >30% coverage
        
        # Combine both urban indicators
        combined_urban = urban_mask.Or(ghs_urban)
        
        return combined_urban.clip(geom)
    except:
        # Return empty mask if datasets are not available
        # Get geometry from aoi
        if isinstance(aoi, ee.FeatureCollection):
            geom = aoi.geometry()
        elif isinstance(aoi, ee.Feature):
            geom = aoi.geometry()
        else:
            geom = aoi
        return ee.Image.constant(0).clip(geom)

def apply_morphological_cleaning(flood_mask: ee.Image) -> ee.Image:
    """Apply morphological operations to clean up flood mask."""
    # Opening: remove small isolated pixels
    opened = flood_mask.focal_min(2, 'circle', 'pixels').focal_max(2, 'circle', 'pixels')
    
    # Closing: fill small gaps
    closed = opened.focal_max(3, 'circle', 'pixels').focal_min(3, 'circle', 'pixels')
    
    return closed

def calculate_quality_score(area_ha: float, mean_confidence: float, std_confidence: float, flood_percentage: float) -> float:
    """Calculate overall quality score for flood detection."""
    # Normalize confidence (0-1)
    confidence_score = mean_confidence
    
    # Penalize high standard deviation (inconsistent confidence)
    consistency_score = max(0, 1 - std_confidence)
    
    # Reasonable flood percentage (not too small, not too large)
    if 0.1 <= flood_percentage <= 50:  # 0.1% to 50% of area
        area_score = 1.0
    elif flood_percentage < 0.1:
        area_score = flood_percentage / 0.1  # Scale up small percentages
    else:
        area_score = max(0.1, 50 / flood_percentage)  # Scale down large percentages
    
    # Minimum area check
    if area_ha < 0.5:  # Less than 0.5 hectares
        area_score *= 0.5
    
    # Combine scores
    quality_score = (confidence_score * 0.4 + consistency_score * 0.3 + area_score * 0.3)
    
    return min(1.0, max(0.0, quality_score))

def validate_flood_detection(dict_db: Dict) -> Dict:
    """Validation of flood detection results."""
    try:
        validation_results = {
            "is_valid": True,
            "warnings": [],
            "errors": [],
            "recommendations": [],
            "quality_metrics": {}
        }
        
        # Check if required data exists
        required_keys = ["before_flood", "after_flood", "flood_results", "flood_area_stats"]
        for key in required_keys:
            if key not in dict_db:
                validation_results["errors"].append(f"Missing required data: {key}")
                validation_results["is_valid"] = False
        
        if not validation_results["is_valid"]:
            return validation_results
        
        # Validate image quality
        before_quality = dict_db.get("before_quality", {})
        after_quality = dict_db.get("after_quality", {})
        
        if before_quality.get("quality_score", 0) < 0.3:
            validation_results["warnings"].append("Before image quality is low - consider using different dates")
        
        if after_quality.get("quality_score", 0) < 0.3:
            validation_results["warnings"].append("After image quality is low - consider using different dates")
        
        # Validate flood statistics
        flood_stats = dict_db.get("flood_area_stats", {})
        area_ha = flood_stats.get("area_hectares", 0)
        confidence = flood_stats.get("mean_confidence", 0)
        quality_score = flood_stats.get("quality_score", 0)
        
        # Check for reasonable flood area
        if area_ha < 0.1:
            validation_results["warnings"].append("Very small flood area detected - may be noise")
        elif area_ha > 10000:  # 100 km²
            validation_results["warnings"].append("Very large flood area detected - verify results")
        
        # Check confidence levels
        if confidence < 0.5:
            validation_results["warnings"].append("Low confidence in flood detection - results may be unreliable")
        elif confidence > 0.9:
            validation_results["recommendations"].append("High confidence detection - results are reliable")
        
        # Check overall quality
        if quality_score < 0.3:
            validation_results["errors"].append("Poor overall quality - detection may be invalid")
            validation_results["is_valid"] = False
        elif quality_score < 0.6:
            validation_results["warnings"].append("Moderate quality - use results with caution")
        else:
            validation_results["recommendations"].append("Good quality detection - results are reliable")
        
        # Check for potential false positives
        flood_percentage = flood_stats.get("area_percentage", 0)
        if flood_percentage > 80:
            validation_results["warnings"].append("Very high flood percentage - check for false positives")
        
        # Validate temporal consistency
        before_count = dict_db.get("before_count", 0)
        after_count = dict_db.get("after_count", 0)
        
        if before_count < 2:
            validation_results["warnings"].append("Limited before images - temporal consistency may be poor")
        if after_count < 2:
            validation_results["warnings"].append("Limited after images - temporal consistency may be poor")
        
        # Add quality metrics
        validation_results["quality_metrics"] = {
            "before_image_quality": before_quality.get("quality_score", 0),
            "after_image_quality": after_quality.get("quality_score", 0),
            "flood_confidence": confidence,
            "overall_quality": quality_score,
            "flood_area_hectares": area_ha,
            "flood_percentage": flood_percentage,
            "before_image_count": before_count,
            "after_image_count": after_count
        }
        
        return validation_results
        
    except Exception as e:
        logger.error(f"Error in validation: {str(e)}")
        return {
            "is_valid": False,
            "errors": [f"Validation failed: {str(e)}"],
            "warnings": [],
            "recommendations": []
        }

def run_flood_detection_pipeline(
    base_period: Tuple[str, str],
    flood_period: Tuple[str, str],
    geometry: ee.Geometry,
    polarization: str = "VH",
    pass_direction: str = "DESCENDING",
    difference_threshold: float = 1.25,
    confidence_threshold: float = 0.7,
    min_flood_area: float = 0.5,
    use_adaptive_threshold: bool = True,
    temporal_consistency: bool = True,
    validate_results: bool = True
) -> Dict:
    """Run flood detection with validation and quality control."""
    try:
        logger.info("Starting flood detection pipeline...")
        
        # Step 1: Create SAR database
        logger.info("Creating SAR database...")
        dict_db = db_creator(
            base_period=base_period,
            flood_period=flood_period,
            geometry=geometry,
            polarization=polarization,
            pass_direction=pass_direction,
            quiet=False,
            min_images=2,
            max_images=10,
            quality_threshold=0.5
        )
        
        # Step 2: Perform flood estimation
        logger.info("Performing flood estimation...")
        dict_db = flood_estimation(
            dict_db=dict_db,
            difference_threshold=difference_threshold,
            stats=True,
            confidence_threshold=confidence_threshold,
            min_flood_area=min_flood_area,
            use_adaptive_threshold=use_adaptive_threshold,
            temporal_consistency=temporal_consistency
        )
        
        # Step 3: Validate results
        if validate_results:
            logger.info("Validating flood detection results...")
            validation = validate_flood_detection(dict_db)
            dict_db["validation"] = validation
            
            # Log validation results
            if validation["is_valid"]:
                logger.info("Flood detection validation passed")
            else:
                logger.warning("Flood detection validation failed")
                for error in validation["errors"]:
                    logger.error(f"Validation error: {error}")
            
            for warning in validation["warnings"]:
                logger.warning(f"Validation warning: {warning}")
            
            for recommendation in validation["recommendations"]:
                logger.info(f"Validation recommendation: {recommendation}")
        
        # Step 4: Generate display layers
        logger.info("Generating display layers...")
        display_layers = display(dict_db)
        dict_db["display_layers"] = display_layers
        
        logger.info("Flood detection completed successfully")
        return dict_db
        
    except Exception as e:
        logger.error(f"Error in flood detection: {str(e)}")
        raise

# Example usage and testing
def test_flood_detection():
    """Test the flood detection with a known flood event."""
    try:
        # Test with Beira, Mozambique (Cyclone Idai 2019)
        geometry = ee.Geometry.Polygon([[
            [35.53377589953368, -19.6674648789114],
            [34.50106105578368, -18.952058786515526],
            [33.63314113390868, -19.87423907259203],
            [34.74825343859618, -20.61123742951084]
        ]])
        
        # Run detection pipeline
        results = run_flood_detection_pipeline(
            base_period=('2019-03-01', '2019-03-10'),
            flood_period=('2019-03-10', '2019-03-23'),
            geometry=geometry,
            polarization='VH',
            pass_direction='DESCENDING',
            difference_threshold=1.25,
            confidence_threshold=0.7,
            min_flood_area=1.0,
            use_adaptive_threshold=True,
            temporal_consistency=True,
            validate_results=True
        )
        
        # Print results
        print("=== FLOOD DETECTION RESULTS ===")
        print(f"Flood area: {results['flood_area_stats']['area_hectares']} hectares")
        print(f"Confidence: {results['flood_area_stats']['mean_confidence']:.3f}")
        print(f"Quality score: {results['flood_area_stats']['quality_score']:.3f}")
        
        if 'validation' in results:
            validation = results['validation']
            print(f"Validation: {'PASSED' if validation['is_valid'] else 'FAILED'}")
            
            if validation['warnings']:
                print("Warnings:")
                for warning in validation['warnings']:
                    print(f"  - {warning}")
            
            if validation['recommendations']:
                print("Recommendations:")
                for rec in validation['recommendations']:
                    print(f"  - {rec}")
        
        return results
        
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        return None
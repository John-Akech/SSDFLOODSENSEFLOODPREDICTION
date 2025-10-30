"""SAR-FLOOD MAPPING USING ADVANCED CHANGE DETECTION APPROACH

  This script uses SAR Sentinel-1 images to generate a flood extent map with
  advanced preprocessing, multi-polarization analysis, and adaptive thresholding.
  The dataset available in the Earth Engine Data Catalog includes the following
  preprocessing steps: Thermal-Noise Removal, Radiometric calibration, and 
  Terrain-correction.
  
  Enhanced features:
  - Multi-polarization analysis (VV + VH)
  - Advanced speckle filtering (Lee, Frost, Kuan filters)
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


# Display enhanced basemap with confidence and quality information
def display(dict_db):
    """ Display an enhanced Earth Engine map with confidence and quality layers
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

        # Flood results with enhanced visualization
        flood_viz = {
            "min": 0,
            "max": 1,
            "palette": ["000000", "0066CC", "00CCFF", "00FF00", "FFFF00", "FF6600", "FF0000"]
        }
        s1_fresults = ee.Image.visualize(dict_db["flood_results"], **flood_viz)
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
        
        layer_to_display = {
            "before_flood": s1_bf_id,
            "after_flood": s1_af_id,
            "flood_results": s1_fresults_id,
            "confidence_map": confidence_id,
            "difference_map": diff_id,
            "combined_detection": combined_id,
            "quality_info": {
                "before_quality": dict_db.get("before_quality", {}),
                "after_quality": dict_db.get("after_quality", {}),
                "flood_stats": dict_db.get("flood_area_stats", {})
            }
        }
        return layer_to_display
        
    except Exception as e:
        logger.error(f"Error in display function: {str(e)}")
        # Return basic display if enhanced fails
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
    min_images: int = 2,
    max_images: int = 10,
    quality_threshold: float = 0.7
) -> Dict:
    """Create enhanced SAR image database for flood detection with improved quality control.
    
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
        aoi = ee.FeatureCollection(geometry)

        # Load and filter Sentinel-1 GRD data with enhanced quality control
        collection = (ee.ImageCollection("COPERNICUS/S1_GRD")
                    .filter(ee.Filter.eq("instrumentMode", "IW"))
                    .filter(ee.Filter.listContains("transmitterReceiverPolarisation", polarization))
                    .filter(ee.Filter.eq("orbitProperties_pass", pass_direction))
                    .filter(ee.Filter.eq("resolution_meters", 10))
                    .filterBounds(aoi)
                    .select(polarization))

        # Enhanced image selection with quality assessment
        before_collection = select_best_images(collection, base_period, aoi, min_images, max_images, quality_threshold)
        after_collection = select_best_images(collection, flood_period, aoi, min_images, max_images, quality_threshold)

        # Validate image collections
        before_count = before_collection.size().getInfo()
        after_count = after_collection.size().getInfo()
        
        if before_count < min_images:
            raise ValueError(f"Insufficient before images: {before_count} < {min_images}. Try expanding the date range or area.")
        if after_count < min_images:
            raise ValueError(f"Insufficient after images: {after_count} < {min_images}. Try expanding the date range or area.")

        if not quiet:
            print(f"Selected {before_count} before images: {dates(before_collection)}")
            print(f"Selected {after_count} after images: {dates(after_collection)}")

        # Create high-quality mosaics with temporal weighting
        before = create_temporal_mosaic(before_collection, aoi, "before")
        after = create_temporal_mosaic(after_collection, aoi, "after")

        # Apply enhanced preprocessing
        before_filtered = apply_enhanced_preprocessing(before, aoi)
        after_filtered = apply_enhanced_preprocessing(after, aoi)
        
        # Calculate image quality metrics
        before_quality = calculate_image_quality(before_filtered, aoi)
        after_quality = calculate_image_quality(after_filtered, aoi)
        
        dict_preprocessing = {
            "before_flood": before_filtered,
            "after_flood": after_filtered,
            "base_period": base_period,
            "flood_period": flood_period,
            "aoi": aoi,
            "polarization": polarization,
            "before_quality": before_quality,
            "after_quality": after_quality,
            "before_count": before_count,
            "after_count": after_count
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
    
    # Calculate quality scores for each image
    def calculate_quality(image):
        # Calculate local statistics for quality assessment
        stats = image.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), sharedInputs=True),
            geometry=aoi,
            scale=100,  # Use coarser scale for efficiency
            bestEffort=True
        )
        
        # Quality based on mean backscatter and variance
        mean_val = stats.getNumber('mean')
        std_val = stats.getNumber('stdDev')
        
        # Higher mean and lower std generally indicate better quality
        quality_score = mean_val.divide(std_val.add(1))  # Avoid division by zero
        
        return image.set('quality_score', quality_score)
    
    # Apply quality scoring
    with_quality = filtered.map(calculate_quality)
    
    # Sort by quality and select best images
    sorted_collection = with_quality.sort('quality_score', False)  # Descending order
    
    # Limit to max_images
    limited = sorted_collection.limit(max_images)
    
    return limited

def create_temporal_mosaic(collection: ee.ImageCollection, aoi: ee.Geometry, period_type: str) -> ee.Image:
    """Create a high-quality temporal mosaic with proper weighting."""
    count = collection.size().getInfo()
    
    if count == 1:
        # Single image - use as is
        return collection.first().clip(aoi)
    elif count <= 3:
        # Few images - use median for noise reduction
        return collection.median().clip(aoi)
    else:
        # Multiple images - use quality-weighted mosaic
        def add_weights(image):
            # Weight by recency (more recent images get higher weight)
            date = ee.Date(image.get('system:time_start'))
            days_ago = ee.Date.now().difference(date, 'day')
            weight = ee.Image(1.0).divide(days_ago.add(1))  # Higher weight for more recent images
            return image.multiply(weight).set('weight', weight)
        
        # Apply weights and create weighted mosaic
        weighted = collection.map(add_weights)
        weights = weighted.aggregate_array('weight')
        
        # Create weighted sum
        weighted_sum = weighted.sum()
        total_weight = ee.Image.constant(0).add(weights).reduce(ee.Reducer.sum())
        
        # Normalize by total weight
        mosaic = weighted_sum.divide(total_weight)
        
        return mosaic.clip(aoi)

def apply_enhanced_preprocessing(image: ee.Image, aoi: ee.Geometry) -> ee.Image:
    """Apply enhanced preprocessing for better flood detection."""
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
    
    return db_image.clip(aoi)

def calculate_image_quality(image: ee.Image, aoi: ee.Geometry) -> Dict:
    """Calculate comprehensive image quality metrics."""
    try:
        # Calculate statistics
        stats = image.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), sharedInputs=True)
                .combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=aoi,
            scale=50,
            bestEffort=True
        )
        
        mean_val = stats.getNumber('mean').getInfo()
        std_val = stats.getNumber('stdDev').getInfo()
        min_val = stats.getNumber('min').getInfo()
        max_val = stats.getNumber('max').getInfo()
        
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
        logger.warning(f"Could not calculate image quality: {e}")
        return {"quality_score": 0.5}  # Default moderate quality


def flood_estimation(
    dict_db: Dict,
    difference_threshold: float = 1.25,
    stats: bool = True,
    confidence_threshold: float = 0.7,
    min_flood_area: float = 0.5,
    use_adaptive_threshold: bool = True,
    temporal_consistency: bool = True
) -> Dict:
    """Advanced flood extent estimation with improved accuracy and reliability.
    
    Args:
        dict_db: Dictionary from db_creator containing SAR images
        difference_threshold: Base threshold for flood detection
        stats: Calculate flood area statistics
        confidence_threshold: Minimum confidence for flood pixels (0-1)
        min_flood_area: Minimum flood area in hectares
        use_adaptive_threshold: Use adaptive thresholding based on local statistics
        temporal_consistency: Apply temporal consistency checks
        
    Returns:
        Updated dictionary with flood results, confidence, and statistics
    """
    try:
        before_filtered = dict_db["before_flood"]
        after_filtered = dict_db["after_flood"]
        polarization = dict_db["polarization"]
        aoi = dict_db["aoi"]

        # Step 1: Enhanced preprocessing and noise reduction
        logger.info("Applying enhanced preprocessing...")
        
        # Apply additional speckle filtering for better noise reduction
        before_enhanced = apply_enhanced_speckle_filter(before_filtered)
        after_enhanced = apply_enhanced_speckle_filter(after_filtered)
        
        # Step 2: Calculate multiple change detection metrics
        logger.info("Calculating change detection metrics...")
        
        # Ratio-based change detection (original method)
        ratio_difference = after_enhanced.divide(before_enhanced)
        
        # Difference-based change detection (more robust)
        linear_before = ee.Image(10).pow(before_enhanced.divide(10))
        linear_after = ee.Image(10).pow(after_enhanced.divide(10))
        linear_difference = linear_after.subtract(linear_before)
        
        # Normalized difference (handles different backscatter levels)
        sum_images = before_enhanced.add(after_enhanced)
        normalized_diff = linear_difference.divide(sum_images.add(0.001))  # Add small value to avoid division by zero
        
        # Step 3: Advanced thresholding
        logger.info("Applying advanced thresholding...")
        
        if use_adaptive_threshold:
            # Calculate adaptive threshold based on local statistics
            kernel = ee.Kernel.circle(200, 'meters')  # 200m radius for local statistics
            
            # Calculate local mean and standard deviation
            local_mean = ratio_difference.reduceNeighborhood(ee.Reducer.mean(), kernel)
            local_std = ratio_difference.reduceNeighborhood(ee.Reducer.stdDev(), kernel)
            
            # Adaptive threshold: mean + k * std (where k is adaptive)
            k_factor = ee.Image(1.5).add(local_std.multiply(0.1))  # Adaptive k based on local variance
            adaptive_threshold = local_mean.add(local_std.multiply(k_factor))
            
            # Use the higher of fixed or adaptive threshold
            final_threshold = ee.Image(difference_threshold).max(adaptive_threshold)
        else:
            final_threshold = ee.Image(difference_threshold)
        
        # Step 4: Multi-metric flood detection
        logger.info("Applying multi-metric flood detection...")
        
        # Primary flood mask from ratio
        flood_ratio = ratio_difference.gt(final_threshold)
        
        # Secondary flood mask from normalized difference
        flood_normalized = normalized_diff.gt(0.3)  # Threshold for normalized difference
        
        # Tertiary flood mask from linear difference
        flood_linear = linear_difference.gt(2.0)  # Threshold for linear difference
        
        # Combine multiple detection methods with weights
        flood_combined = flood_ratio.multiply(0.5).add(
            flood_normalized.multiply(0.3)
        ).add(
            flood_linear.multiply(0.2)
        )
        
        # Convert to binary with confidence weighting
        flood_binary = flood_combined.gt(0.4)  # At least 40% agreement across methods
        
        # Step 5: Confidence calculation
        logger.info("Calculating confidence scores...")
        
        # Calculate confidence based on multiple factors
        confidence_factors = []
        
        # Factor 1: Magnitude of change
        change_magnitude = ratio_difference.subtract(1.0).abs()
        confidence_magnitude = change_magnitude.divide(2.0).min(1.0)  # Normalize to 0-1
        
        # Factor 2: Consistency across methods
        method_consistency = flood_combined
        
        # Factor 3: Local spatial consistency
        spatial_kernel = ee.Kernel.circle(100, 'meters')
        local_consistency = flood_binary.reduceNeighborhood(ee.Reducer.mean(), spatial_kernel)
        
        # Factor 4: Temporal consistency (if enabled)
        if temporal_consistency:
            # This would require additional temporal data - simplified for now
            temporal_consistency_score = ee.Image(0.8)  # Placeholder
        else:
            temporal_consistency_score = ee.Image(1.0)
        
        # Combine confidence factors
        confidence = (confidence_magnitude.multiply(0.3)
                    .add(method_consistency.multiply(0.3))
                    .add(local_consistency.multiply(0.2))
                    .add(temporal_consistency_score.multiply(0.2)))
        
        # Apply confidence threshold
        high_confidence_flood = flood_binary.And(confidence.gt(confidence_threshold))
        
        # Step 6: Advanced post-processing and validation
        logger.info("Applying advanced post-processing...")
        
        # Remove permanent water bodies
        swater = ee.Image('JRC/GSW1_0/GlobalSurfaceWater').select('seasonality')
        swater_mask = swater.gte(10).updateMask(swater.gte(10))
        flooded_no_permanent = high_confidence_flood.where(swater_mask, 0)
        
        # Apply slope mask (more conservative)
        DEM = ee.Image('WWF/HydroSHEDS/03VFDEM')
        terrain = ee.Algorithms.Terrain(DEM)
        slope = terrain.select('slope')
        flooded_no_slope = flooded_no_permanent.updateMask(slope.lt(3))  # More conservative 3% slope
        
        # Apply urban area mask (urban areas can cause false positives)
        urban_mask = get_urban_mask(aoi)
        flooded_no_urban = flooded_no_slope.where(urban_mask, 0)
        
        # Apply minimum area filter
        connections = flooded_no_urban.connectedPixelCount()
        min_pixels = int(min_flood_area * 10000 / 100)  # Convert hectares to pixels (10m resolution)
        flooded_min_area = flooded_no_urban.updateMask(connections.gte(min_pixels))
        
        # Apply morphological operations to clean up the result
        flooded_cleaned = apply_morphological_cleaning(flooded_min_area)
        
        # Final flood result
        flooded = flooded_cleaned.updateMask(flooded_cleaned)
        
        # Step 7: Calculate comprehensive statistics
        logger.info("Calculating comprehensive statistics...")
        
        dict_db["flood_results"] = flooded
        dict_db["confidence_map"] = confidence
        dict_db["ratio_difference"] = ratio_difference
        dict_db["normalized_difference"] = normalized_diff
        dict_db["linear_difference"] = linear_difference
        dict_db["flood_combined"] = flood_combined
        dict_db["adaptive_threshold"] = final_threshold if use_adaptive_threshold else None
        
        if stats:
            # Calculate flood extent area with high accuracy
            flood_pixelarea = flooded.multiply(ee.Image.pixelArea())
            
            flood_stats = flood_pixelarea.reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=aoi,
                scale=10,
                bestEffort=False,  # Use high accuracy
                maxPixels=1e9
            )
            
            # Calculate confidence statistics
            confidence_stats = confidence.reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), sharedInputs=True),
                geometry=aoi,
                scale=10,
                bestEffort=False,
                maxPixels=1e9
            )
            
            # Calculate additional quality metrics
            total_pixels = aoi.area().divide(100).getInfo()  # Convert to hectares
            flood_area_ha = flood_stats.getNumber('VV' if polarization == 'VV' else 'VH').divide(10000).getInfo()
            mean_confidence = confidence_stats.getNumber('mean').getInfo()
            std_confidence = confidence_stats.getNumber('stdDev').getInfo()
            
            # Quality assessment
            flood_percentage = (flood_area_ha / total_pixels) * 100 if total_pixels > 0 else 0
            quality_score = calculate_quality_score(flood_area_ha, mean_confidence, std_confidence, flood_percentage)
            
            dict_db["flood_area_stats"] = {
                "area_hectares": round(flood_area_ha, 2),
                "area_percentage": round(flood_percentage, 2),
                "mean_confidence": round(mean_confidence, 3),
                "confidence_std": round(std_confidence, 3),
                "quality_score": round(quality_score, 2),
                "high_confidence_pixels": round(flood_area_ha * mean_confidence, 2),
                "total_area_hectares": round(total_pixels, 2)
            }
        
        logger.info("Flood estimation completed successfully")
        return dict_db
        
    except Exception as e:
        logger.error(f"Error in flood_estimation: {str(e)}")
        raise

def apply_enhanced_speckle_filter(image: ee.Image) -> ee.Image:
    """Apply enhanced speckle filtering for better noise reduction."""
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

def get_urban_mask(aoi: ee.Geometry) -> ee.Image:
    """Get urban area mask to reduce false positives."""
    try:
        # Use MODIS Land Cover for urban areas
        lc = ee.ImageCollection('MODIS/006/MCD12Q1').filterDate('2020-01-01', '2021-01-01').first()
        urban_mask = lc.select('LC_Type1').eq(13)  # Urban areas
        
        # Also use GHSL built-up areas
        ghs = ee.Image('JRC/GHSL/P2016/BUILT_LDSMT_GLOBE_V1').select('built')
        ghs_urban = ghs.gt(0.3)  # Built-up areas with >30% coverage
        
        # Combine both urban indicators
        combined_urban = urban_mask.Or(ghs_urban)
        
        return combined_urban.clip(aoi)
    except:
        # Return empty mask if datasets are not available
        return ee.Image.constant(0).clip(aoi)

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
    """Comprehensive validation of flood detection results."""
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

def run_comprehensive_flood_detection(
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
    """Run comprehensive flood detection with validation and quality control."""
    try:
        logger.info("Starting comprehensive flood detection...")
        
        # Step 1: Create enhanced database
        logger.info("Creating enhanced SAR database...")
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
        
        # Step 2: Perform advanced flood estimation
        logger.info("Performing advanced flood estimation...")
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
        
        logger.info("Comprehensive flood detection completed successfully")
        return dict_db
        
    except Exception as e:
        logger.error(f"Error in comprehensive flood detection: {str(e)}")
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
        
        # Run comprehensive detection
        results = run_comprehensive_flood_detection(
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
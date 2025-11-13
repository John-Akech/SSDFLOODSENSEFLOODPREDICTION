"""
Google Earth Engine Data Extraction
====================================
This script extracts satellite data from Google Earth Engine for flood prediction.

Data sources:
- CHIRPS: Daily precipitation (rainfall patterns)
- JRC: Global surface water (water occurrence and extent)
- SRTM: Digital elevation model (topography)
- SMAP: Soil moisture (surface and subsurface)

The script extracts features for three flood-prone regions in South Sudan:
- Jonglei State
- Unity State  
- Upper Nile State

Saves data to:
1. Database (gee_extracted_features table) - PRIMARY STORAGE
2. CSV file (for backup and manual inspection)

Author: John Akech
Date: November 2025
"""

import ee
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import json
import sys
import os

# Add parent directory to path to import database models
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.core.database import SessionLocal, engine, Base
from app.models.database_models import GEEExtractedFeature

# Output directory (for CSV backup)
OUTPUT_DIR = Path(__file__).parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# Time window for feature extraction (90 days)
END_DATE = datetime.now()
START_DATE = END_DATE - timedelta(days=90)

# GEE Project ID
GEE_PROJECT_ID = "ace-connection-474712-p1"

print("=" * 80)
print("STEP 0: Extract Satellite Data from Google Earth Engine")
print("=" * 80)
print(f"Time window: {START_DATE.date()} to {END_DATE.date()}")
print(f"Project ID: {GEE_PROJECT_ID}")
print("=" * 80)

# Initialize Google Earth Engine
try:
    ee.Initialize(project='ace-connection-474712-p1')
    print(f"GEE initialized successfully")
except Exception as e:
    print(f"ERROR: GEE initialization failed: {e}")
    print("Please run: earthengine authenticate")
    sys.exit(1)

# Define regions of interest (flood-prone areas in South Sudan)
# These are approximate boundaries - in production, use precise administrative boundaries
regions = {
    'Jonglei': {
        'coords': [
            [32.0, 6.0], [33.5, 6.0], [33.5, 8.0], [32.0, 8.0], [32.0, 6.0]
        ],
        'description': 'Jonglei State - Eastern South Sudan'
    },
    'Unity': {
        'coords': [
            [29.5, 8.0], [31.0, 8.0], [31.0, 10.0], [29.5, 10.0], [29.5, 8.0]
        ],
        'description': 'Unity State - Northern South Sudan'
    },
    'Upper_Nile': {
        'coords': [
            [31.5, 9.0], [33.5, 9.0], [33.5, 10.5], [31.5, 10.5], [31.5, 9.0]
        ],
        'description': 'Upper Nile State - Northeastern South Sudan'
    }
}

# Create geometry objects for each region
print("\nRegions defined:")
geometries = {}
for region_name, region_data in regions.items():
    geometries[region_name] = ee.Geometry.Polygon(region_data['coords'])
    print(f"  {region_name}: {region_data['description']}")

# Combine all regions into a single geometry (useful for some operations)
south_sudan_geometry = ee.Geometry.MultiPolygon([
    list(geometries.values())
])
print(f"Combined geometry created for all 3 regions")

print("\n" + "=" * 80)
print("Extracting features from satellite data...")
print("=" * 80)


def extract_rainfall_features(geometry, start_date, end_date):
    """
    Extract rainfall features from CHIRPS dataset.
    CHIRPS provides daily precipitation estimates.
    """
    # Load CHIRPS precipitation data
    chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY') \
        .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
        .filterBounds(geometry)
    
    features = {}
    
    # Calculate rainfall statistics for different time windows
    # This helps capture both short-term and long-term patterns
    time_windows = {
        '7d': 7,    # Last week
        '30d': 30,  # Last month
        '60d': 60,  # Last 2 months
        '90d': 90   # Last 3 months
    }
    
    for window_name, days in time_windows.items():
        window_start = end_date - timedelta(days=days)
        if window_start < start_date:
            window_start = start_date
            
        window_data = chirps.filterDate(
            window_start.strftime('%Y-%m-%d'),
            end = ee.Date(end_date)
        )
        
        # Mean rainfall
        mean_precip = window_data.mean().reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=5000,  # 5km resolution
            maxPixels=1e9
        ).get('precipitation')
        features[f'precipitation_mean_{window_name}'] = mean_precip
        
        # Maximum rainfall (extreme events)
        max_precip = window_data.max().reduceRegion(
            reducer=ee.Reducer.max(),
            geometry=geometry,
            scale=5000,
            maxPixels=1e9
        ).get('precipitation')
        features[f'precipitation_max_{window_name}'] = max_precip
        
        # Total accumulated rainfall
        sum_precip = window_data.sum().reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=geometry,
            scale=5000,
            maxPixels=1e9
        ).get('precipitation')
        features[f'precipitation_sum_{window_name}'] = sum_precip
    
    return features


def extract_water_features(geometry, start_date, end_date):
    """
    Extract water features from JRC Global Surface Water dataset.
    This shows historical water occurrence and extent.
    """
    # JRC Global Surface Water - shows where water has been observed
    water = ee.Image('JRC/GSW1_3/GlobalSurfaceWater')
    
    features = {}
    
    # Water occurrence (0-100%): how often water was present
    occurrence = water.select('occurrence').reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geometry,
        scale=30,  # 30m resolution
        maxPixels=1e9
    ).get('occurrence')
    features['water_occurrence_mean'] = occurrence
    
    # Maximum water extent
    max_extent = water.select('max_extent').reduceRegion(
        reducer=ee.Reducer.max(),
        geometry=geometry,
        scale=30,
        maxPixels=1e9
    ).get('max_extent')
    features['water_occurrence_max'] = max_extent
    
    return features


def extract_topographic_features(geometry):
    """
    Extract topographic features from SRTM elevation data.
    Elevation and slope affect flood susceptibility.
    """
    # SRTM Digital Elevation Model
    srtm = ee.Image('USGS/SRTMGL1_003')
    elevation = srtm.select('elevation')
    
    features = {}
    
    # Mean elevation
    mean_elev = elevation.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geometry,
        scale=30,
        maxPixels=1e9
    ).get('elevation')
    features['elevation_mean'] = mean_elev
    
    # Elevation standard deviation (terrain roughness)
    std_elev = elevation.reduceRegion(
        reducer=ee.Reducer.stdDev(),
        geometry=geometry,
        scale=30,
        maxPixels=1e9
    ).get('elevation')
    features['elevation_std'] = std_elev
    
    # Calculate slope (steeper slopes drain faster)
    slope = ee.Terrain.slope(elevation)
    mean_slope = slope.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geometry,
        scale=30,
        maxPixels=1e9
    ).get('slope')
    features['slope_mean'] = mean_slope
    
    return features


def extract_soil_moisture_features(geometry, start_date, end_date):
    """
    Extract soil moisture from SMAP dataset.
    Saturated soil increases flood risk.
    """
    # SMAP Soil Moisture
    smap = ee.ImageCollection('NASA_USDA/HSL/SMAP10KM_soil_moisture') \
        .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
        .filterBounds(geometry)
    
    features = {}
    
    # Surface soil moisture (0-5 cm depth)
    surface_sm = smap.select('ssm').mean().reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geometry,
        scale=10000,  # 10km resolution
        maxPixels=1e9
    ).get('ssm')
    features['soil_moisture_surface_mean'] = surface_sm
    
    # Subsurface soil moisture (0-100 cm depth)
    subsurface_sm = smap.select('susm').mean().reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geometry,
        scale=10000,
        maxPixels=1e9
    ).get('susm')
    features['soil_moisture_subsurface_mean'] = subsurface_sm
    
    return features


# Extract features for each region
print("\nExtracting features for each region...")
all_features = []

for region_name, geometry in geometries.items():
    print(f"\nProcessing {region_name}...")
    
    region_features = {'region': region_name}
    
    try:
        # Rainfall patterns (most important for flooding)
        print(f"  - Extracting rainfall features...")
        rainfall = extract_rainfall_features(geometry, START_DATE, END_DATE)
        region_features.update(rainfall)
        print(f"      Rainfall features extracted")
        
        # Water presence indicators
        print(f"  - Extracting water features...")
        water = extract_water_features(geometry, START_DATE, END_DATE)
        region_features.update(water)
        print(f"      Water features extracted")
        
        # Topographic characteristics
        print(f"  - Extracting topographic features...")
        topo = extract_topographic_features(geometry)
        region_features.update(topo)
        print(f"      Topographic features extracted")
        
        # Soil moisture levels
        print(f"  - Extracting soil moisture features...")
        soil = extract_soil_moisture_features(geometry, START_DATE, END_DATE)
        region_features.update(soil)
        print(f"      Soil moisture features extracted")
        
        all_features.append(region_features)
        
    except Exception as e:
        print(f"  ERROR processing {region_name}: {e}")
        continue

print(f"Feature extraction complete for {len(all_features)} regions")

# Convert to DataFrame
print("\n" + "=" * 80)
print("Creating dataset...")
print("=" * 80)

df = pd.DataFrame(all_features)
print(f"DataFrame created: {len(df)} rows × {len(df.columns)} columns")

# Get computed values (this triggers the actual GEE computation)
print("\nRetrieving computed values from GEE...")
for idx, row in df.iterrows():
    region = row['region']
    print(f"  Processing {region}...")
    for col in df.columns:
        if col != 'region':
            value = row[col]
            if isinstance(value, ee.ComputedObject):
                try:
                    computed_value = value.getInfo()
                    df.at[idx, col] = computed_value
                except Exception as e:
                    print(f"    Warning: Could not compute {col}: {e}")
                    df.at[idx, col] = None

# Data quality checks
print("\n" + "=" * 80)
print("Quality checks...")
print("=" * 80)

# Fill missing values with 0 (conservative approach)
df = df.fillna(0)

# Clip negative rainfall values (shouldn't happen but just in case)
rainfall_cols = [col for col in df.columns if 'precipitation' in col]
for col in rainfall_cols:
    df[col] = df[col].clip(lower=0)

print(f"   Data validated")

# Save to CSV (backup)
output_csv = OUTPUT_DIR / "00_gee_extracted_features.csv"
df.to_csv(output_csv, index=False)

print(f"\n" + "=" * 80)
print("Saving results...")
print("=" * 80)
print(f"Saved to CSV: {output_csv}")

# Save to Database (PRIMARY STORAGE)
print("\nSaving to database...")
db = SessionLocal()
saved_count = 0
try:
    # Create table if it doesn't exist
    Base.metadata.create_all(bind=engine)
    
    for _, row in df.iterrows():
        feature = GEEExtractedFeature(
            region=row['region'],
            extraction_date=datetime.now(),
            start_date=START_DATE,
            end_date=END_DATE,
            # Precipitation features
            precipitation_sum=float(row.get('precipitation_sum', 0)),
            precipitation_mean=float(row.get('precipitation_mean', 0)),
            precipitation_max=float(row.get('precipitation_max', 0)),
            precipitation_min=float(row.get('precipitation_min', 0)),
            # SAR features
            VV_mean=float(row.get('VV_mean', 0)),
            VV_std=float(row.get('VV_std', 0)),
            VV_min=float(row.get('VV_min', 0)),
            VV_max=float(row.get('VV_max', 0)),
            VH_mean=float(row.get('VH_mean', 0)),
            VH_std=float(row.get('VH_std', 0)),
            VH_min=float(row.get('VH_min', 0)),
            VH_max=float(row.get('VH_max', 0)),
            VV_stdDev_mean=float(row.get('VV_stdDev_mean', 0)),
            VH_stdDev_mean=float(row.get('VH_stdDev_mean', 0)),
            # Water features
            water_occurrence_mean=float(row.get('water_occurrence_mean', 0)),
            water_occurrence_max=float(row.get('water_occurrence_max', 0)),
            # Topography features
            elevation_mean=float(row.get('elevation_mean', 0)),
            slope_mean=float(row.get('slope_mean', 0)),
            # Soil moisture (optional)
            soil_moisture_mean=float(row.get('soil_moisture_mean', 0)) if 'soil_moisture_mean' in row else None,
            # Metadata
            gee_project_id=GEE_PROJECT_ID
        )
        db.add(feature)
        saved_count += 1
    
    db.commit()
    print(f"   Saved {saved_count} records to database (gee_extracted_features table)")
    print(f"   Database: {os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database', 'floodsense.db'))}")
except Exception as e:
    print(f"   Error saving to database: {e}")
    db.rollback()
    print(f"   Note: Data still saved to CSV as backup")
finally:
    db.close()

# Save metadata
metadata = {
    'extraction_date': datetime.now().isoformat(),
    'time_window': {
        'start': START_DATE.date().isoformat(),
        'end': END_DATE.date().isoformat(),
        'days': (END_DATE - START_DATE).days
    },
    'regions': list(regions.keys()),
    'num_regions': len(regions),
    'features_extracted': list(df.columns),
    'num_features': len(df.columns) - 1,  # Exclude 'region' column
    'data_sources': {
        'CHIRPS': 'Daily precipitation (UCSB-CHG/CHIRPS/DAILY)',
        'JRC': 'Global surface water (JRC/GSW1_3/GlobalSurfaceWater)',
        'SRTM': 'Digital elevation (USGS/SRTMGL1_003)',
        'SMAP': 'Soil moisture (NASA_USDA/HSL/SMAP10KM_soil_moisture)'
    },
    'gee_project_id': GEE_PROJECT_ID,
    'output_file': str(output_csv),
    'rows': len(df),
    'columns': len(df.columns)
}

metadata_path = OUTPUT_DIR / "00_gee_metadata.json"
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)

print(f"Saved metadata: {metadata_path}")

# Summary
print("\n" + "=" * 80)
print("STEP 0 COMPLETE")
print("=" * 80)
print(f"GEE data extraction successful")
print(f"\nData saved to:")
print(f"  1. Database: gee_extracted_features table ({saved_count} records)")
print(f"  2. CSV backup: {output_csv}")
print(f"  3. Metadata: {metadata_path}")
print(f"\nReady for Step 1: Load and merge with historical data")
print("=" * 80)

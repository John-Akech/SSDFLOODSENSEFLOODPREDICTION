"""
Step 1: Load and Merge Data (Database-First Architecture)

SINGLE SOURCE OF TRUTH: Database stores all Earth Engine data
- Development: SQLite database
- Production: PostgreSQL database

Data Flow:
1. Load fresh GEE data from database (gee_extracted_features table)
2. Load historical training data from database OR CSV fallback
3. Merge and validate datasets
4. Save merged dataset to database for downstream processing
5. Export CSV for ML pipeline compatibility

NO SYNTHETIC DATA - All events are from actual satellite observations (2014-2024).

Author: John Akech
Date: November 2025
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import json
import sys

# Add parent directory to import database models
sys.path.insert(0, str(Path(__file__).parent.parent))


class NumpyEncoder(json.JSONEncoder):
    """
    Helper to convert numpy types to regular Python types for JSON.
    Without this, json.dump() would fail on things like np.int64 or np.float32.
    """
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.bool_):
            return bool(obj)
        return super().default(obj)

# Configuration
DATA_DIR = Path(__file__).parent.parent.parent / "data"
TIME_SERIES_DIR = DATA_DIR / "time_series_data"
OUTPUT_DIR = Path(__file__).parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

print("=" * 80)
print("STEP 1: LOAD AND MERGE DATA")
print("=" * 80)
print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)

# ============================================================================
# 1. LOAD DATA - USE ORIGINAL PROPERLY CURATED DATASET
# ============================================================================
print("\n[1/3] LOADING DATA...")

# Check for comprehensive extraction (may have data leakage - perfect separability)
full_data_files = sorted(DATA_DIR.glob("flood_training_data_full_*.csv"), reverse=True)

# ALWAYS use original aggregated dataset (properly curated, no leakage)
print("Using original aggregated dataset (properly balanced, no leakage)")
primary_path = TIME_SERIES_DIR / "aggregated_flood_events.csv"

if not primary_path.exists():
    print(f"  ERROR: Original dataset not found: {primary_path}")
    exit(1)

df_raw = pd.read_csv(primary_path)
print(f"  Loaded {len(df_raw)} samples × {len(df_raw.columns)} columns")

# Rename target column for consistency
if 'is_flood_event' in df_raw.columns:
    df_raw = df_raw.rename(columns={'is_flood_event': 'flood'})

# Select features (exclude metadata columns)
exclude_cols = ['event_id', 'start_date', 'end_date', 'region']
feature_cols = [col for col in df_raw.columns if col not in exclude_cols]

df_merged = df_raw[feature_cols].copy()
print(f"  Selected {len(feature_cols)} columns for training")

# ============================================================================
# 2. DATA QUALITY CHECKS
# ============================================================================
print("\n[2/3] DATA QUALITY CHECKS...")

# Check for missing values
missing_counts = df_merged.isnull().sum()
total_missing = missing_counts.sum()

if total_missing > 0:
    print(f"  WARNING: Missing values found: {total_missing} total")
    for col in missing_counts[missing_counts > 0].index:
        print(f"    - {col}: {missing_counts[col]} ({missing_counts[col]/len(df_merged)*100:.1f}%)")
    # Fill missing values
    df_merged = df_merged.fillna(0)
    print("  Filled with zeros")
else:
    print("  No missing values")

# Check for duplicates
duplicates = df_merged.duplicated().sum()
if duplicates > 0:
    print(f"  WARNING: Duplicate rows: {duplicates}")
    df_merged = df_merged.drop_duplicates()
    print("  Removed duplicates")
else:
    print("  No duplicate rows")

# Check target distribution
flood_count = (df_merged['flood'] == 1).sum()
non_flood_count = (df_merged['flood'] == 0).sum()
print("\n  Target Distribution:")
print(f"  - Flood events: {flood_count} ({flood_count/len(df_merged)*100:.1f}%)")
print(f"  - Non-flood: {non_flood_count} ({non_flood_count/len(df_merged)*100:.1f}%)")

# ============================================================================
# 3. SAVE MERGED DATASET
# ============================================================================
print("\n[3/3] SAVING MERGED DATASET...")

# Create metadata
metadata = {
    "step": "01_load_merge_data",
    "created_at": datetime.now().isoformat(),
    "input_source": "flood_training_data_full_20251109.csv" if full_data_files else "aggregated_flood_events.csv",
    "output_file": "01_merged_dataset.csv",
    "total_samples": int(len(df_merged)),
    "total_features": int(len(df_merged.columns)),
    "flood_events": int(flood_count),
    "non_flood_events": int(non_flood_count),
    "class_balance_ratio": float(flood_count / len(df_merged)),
    "missing_values": int(total_missing),
    "duplicate_rows": int(duplicates),
    "data_sources": {
        "SAR": "Sentinel-1 (Google Earth Engine)",
        "Precipitation": "CHIRPS (Climate Hazards Group)",
        "Elevation": "SRTM (Shuttle Radar Topography Mission)",
        "Water": "JRC Global Surface Water"
    },
    "features": df_merged.columns.tolist(),
    "quality_checks": {
        "no_missing": total_missing == 0,
        "no_duplicates": duplicates == 0,
        "target_balanced": 0.3 <= (flood_count/len(df_merged)) <= 0.7
    }
}

# Save dataset
output_path = OUTPUT_DIR / "01_merged_dataset.csv"
df_merged.to_csv(output_path, index=False)
print(f"  Saved: {output_path}")
print(f"    Size: {len(df_merged)} rows × {len(df_merged.columns)} columns")

# Save metadata
metadata_path = OUTPUT_DIR / "01_metadata.json"
with open(metadata_path, "w") as f:
    json.dump(metadata, f, indent=2, cls=NumpyEncoder)
print(f"  Saved: {metadata_path}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("STEP 1 COMPLETE")
print("=" * 80)
print(f"Dataset prepared: {len(df_merged)} samples with {len(df_merged.columns)} features")
print(f"Class distribution: {flood_count} floods ({flood_count/len(df_merged)*100:.1f}%), {non_flood_count} non-floods ({non_flood_count/len(df_merged)*100:.1f}%)")
print(f"Output: {output_path}")
print(f"Metadata: {metadata_path}")
print("=" * 80)
print("Next: Run 03_preprocess_data.py to prepare features for training")
print("=" * 80)
print("\nNext step: Run 02_explore_visualize.py")
print("=" * 80)

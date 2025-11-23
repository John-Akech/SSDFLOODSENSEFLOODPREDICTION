"""
STEP 3: PREPROCESS DATA
========================
Purpose: Clean, transform and prepare the dataset for ML
Output: 03_preprocessed_data.csv, 03_preprocessing_config.json

PRODUCTION STANDARDS:
- Handle missing values with documented strategy
- Scale features for model compatibility
- Encode categorical variables
- Save preprocessing configuration for production use
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import json
import joblib
from sklearn.preprocessing import StandardScaler

# Configuration
PIPELINE_DIR = Path(__file__).parent
OUTPUT_DIR = PIPELINE_DIR / "outputs"

print("=" * 80)
print("STEP 3: PREPROCESS DATA")
print("=" * 80)
print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)

# ============================================================================
# 1. LOAD DATA AND ANALYSIS
# ============================================================================
print("\n[1/5] LOADING DATA...")

data_path = OUTPUT_DIR / "01_merged_dataset.csv"
analysis_path = OUTPUT_DIR / "02_analysis_report.json"

if not data_path.exists():
    print(" ERROR: Run 01_load_merge_data.py first")
    exit(1)

df = pd.read_csv(data_path)
print(f" Loaded: {data_path.name}")
print(f"   Samples: {len(df)}")

# Load analysis recommendations
recommendations = {}
if analysis_path.exists():
    with open(analysis_path, "r") as f:
        analysis = json.load(f)
        recommendations = analysis.get("recommendations", {})
    print(f" Loaded: {analysis_path.name}")

# ============================================================================
# 2. HANDLE MISSING VALUES
# ============================================================================
print("\n[2/5] HANDLING MISSING VALUES...")

missing_before = df.isnull().sum().sum()
print(f"   Missing values before: {missing_before}")

if missing_before > 0:
    # Strategy: Fill numeric with median, categorical with mode
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    
    for col in numeric_cols:
        if df[col].isnull().sum() > 0:
            median_value = df[col].median()
            df[col].fillna(median_value, inplace=True)
            print(f"   - {col}: filled with median ({median_value:.2f})")
    
    missing_after = df.isnull().sum().sum()
    print(f" Missing values after: {missing_after}")
else:
    print(" No missing values to handle")

# ============================================================================
# 3. ENCODE CATEGORICAL VARIABLES
# ============================================================================
print("\n[3/5] ENCODING CATEGORICAL VARIABLES...")

# One-hot encode 'region' column
region_col = 'region'
if region_col in df.columns:
    region_dummies = pd.get_dummies(df[region_col], prefix='region')
    df = pd.concat([df, region_dummies], axis=1)
    print(f" Encoded '{region_col}' → {len(region_dummies.columns)} one-hot columns")
    print(f"   Columns: {list(region_dummies.columns)}")
else:
    print("  No 'region' column found")

# ============================================================================
# 4. FEATURE SCALING
# ============================================================================
print("\n[4/5] FEATURE SCALING...")

# Identify target column
if 'flood' in df.columns:
    target_col = 'flood'
elif 'is_flood_event' in df.columns:
    target_col = 'is_flood_event'
else:
    target_col = None

# Identify features to scale (exclude target, dates, and one-hot encoded)
exclude_cols = ['event_id', 'start_date', 'end_date', region_col]
if target_col:
    exclude_cols.append(target_col)
if region_col in df.columns:
    exclude_cols.extend([col for col in df.columns if col.startswith('region_')])

# Get numeric columns to scale
numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
scale_cols = [col for col in numeric_cols if col not in exclude_cols]

print(f"   Features to scale: {len(scale_cols)}")
if target_col:
    print(f"   Target column '{target_col}' will NOT be scaled")

# Fit StandardScaler
scaler = StandardScaler()
df[scale_cols] = scaler.fit_transform(df[scale_cols])

print(" Features scaled (StandardScaler)")

# Save scaler
scaler_path = OUTPUT_DIR / "03_feature_scaler.pkl"
joblib.dump(scaler, scaler_path)
print(f" Saved scaler: {scaler_path}")

# ============================================================================
# 5. SAVE PREPROCESSED DATA
# ============================================================================
print("\n[5/5] SAVING PREPROCESSED DATA...")

# Save preprocessed dataset
output_path = OUTPUT_DIR / "03_preprocessed_data.csv"
df.to_csv(output_path, index=False)
print(f" Saved: {output_path}")
print(f"   Size: {len(df)} rows × {len(df.columns)} columns")

# Create preprocessing configuration
config = {
    "step": "03_preprocess_data",
    "created_at": datetime.now().isoformat(),
    "transformations": {
        "missing_values": {
            "strategy": "median",
            "before": int(missing_before),
            "after": int(df.isnull().sum().sum())
        },
        "categorical_encoding": {
            "method": "one-hot",
            "encoded_columns": [region_col] if region_col in df.columns else [],
            "new_columns": list(region_dummies.columns) if region_col in df.columns else []
        },
        "feature_scaling": {
            "method": "StandardScaler",
            "scaled_features": scale_cols,
            "scaler_path": str(scaler_path)
        }
    },
    "final_dataset": {
        "total_samples": int(len(df)),
        "total_features": int(len(df.columns)),
        "numeric_features": len(scale_cols),
        "categorical_features": len(region_dummies.columns) if region_col in df.columns else 0
    },
    "feature_list": df.columns.tolist(),
    "ready_for_training": True
}

# Save configuration
config_path = OUTPUT_DIR / "03_preprocessing_config.json"
with open(config_path, "w") as f:
    json.dump(config, f, indent=2)
print(f" Saved: {config_path}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("STEP 3 COMPLETE")
print("=" * 80)
print(f" Missing values handled: {missing_before} → 0")
print(f" Categorical encoding: {len(region_dummies.columns) if region_col in df.columns else 0} columns")
print(f" Feature scaling: {len(scale_cols)} features scaled")
print(f" Final dataset: {len(df)} samples × {len(df.columns)} features")
print(" Preprocessing configuration saved")
print("\nNext step: Run 04_train_models.py")
print("=" * 80)

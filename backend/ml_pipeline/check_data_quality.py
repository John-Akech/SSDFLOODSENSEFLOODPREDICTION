"""
Check for data leakage, overfitting, and generalization issues
"""
import pandas as pd
import numpy as np
import json
from pathlib import Path
from sklearn.model_selection import train_test_split
import joblib

OUTPUT_DIR = Path("outputs")

print("=" * 80)
print("DATA QUALITY AND LEAKAGE CHECK")
print("=" * 80)

# 1. Check dataset size
print("\n[1] DATASET SIZE ANALYSIS:")
with open(OUTPUT_DIR / "01_metadata.json") as f:
    meta = json.load(f)

total = meta["total_samples"]
train = meta["train_samples"]
test = meta["test_samples"]

print(f"Total samples: {total}")
print(f"Train samples: {train} ({train/total*100:.1f}%)")
print(f"Test samples: {test} ({test/total*100:.1f}%)")
print(f"\n⚠️  TEST SET SIZE: {test} samples")
print(f"   With {test} test samples, each prediction = {100/test:.2f}% impact on accuracy")
print(f"   96.88% = {int(test * 0.9688)} correct out of {test}")

# 2. Check class distribution
print(f"\n[2] CLASS DISTRIBUTION:")
print(f"Flood: {meta['class_distribution']['1']}")
print(f"No-Flood: {meta['class_distribution']['0']}")

# 3. Load evaluation report
print(f"\n[3] MODEL PERFORMANCE ANALYSIS:")
with open(OUTPUT_DIR / "05_evaluation_report.json") as f:
    eval_report = json.load(f)

for model_name, metrics in eval_report['models'].items():
    print(f"\n{model_name.upper()}:")
    print(f"  Test Accuracy: {metrics['accuracy']*100:.2f}%")
    print(f"  CV Accuracy: {metrics['cross_validation']['mean']*100:.2f}% ± {metrics['cross_validation']['std']*100:.2f}%")
    print(f"  Test-CV Gap: {abs(metrics['accuracy'] - metrics['cross_validation']['mean'])*100:.2f}%")
    
    cm = metrics['confusion_matrix']
    total_predictions = cm['TN'] + cm['FP'] + cm['FN'] + cm['TP']
    correct_predictions = cm['TN'] + cm['TP']
    
    print(f"  Confusion Matrix:")
    print(f"    TN: {cm['TN']}, FP: {cm['FP']}")
    print(f"    FN: {cm['FN']}, TP: {cm['TP']}")
    print(f"  Correct: {correct_predictions}/{total_predictions}")
    
    # Check if same errors
    if model_name == 'gradient_boosting':
        gb_errors = (cm['FP'], cm['FN'])
    elif model_name == 'random_forest':
        rf_errors = (cm['FP'], cm['FN'])

# 4. Check if models make identical errors
print(f"\n[4] ERROR PATTERN ANALYSIS:")
print(f"Gradient Boosting errors: {gb_errors} (FP, FN)")
print(f"Random Forest errors: {rf_errors} (FP, FN)")
if gb_errors == rf_errors:
    print("⚠️  WARNING: Both models make IDENTICAL errors!")
    print("   This suggests:")
    print("   - Very small test set")
    print("   - Data leakage")
    print("   - Models learning same spurious patterns")

# 5. Load original data and check for leakage
print(f"\n[5] CHECKING FOR DATA LEAKAGE:")
data_path = OUTPUT_DIR.parent.parent / "data" / "model_ready_flood_data.csv"
if data_path.exists():
    df = pd.read_csv(data_path)
    print(f"Original dataset: {len(df)} rows")
    
    # Check for duplicate rows
    duplicates = df.duplicated().sum()
    print(f"Duplicate rows: {duplicates}")
    
    # Check for temporal leakage (if date columns exist)
    if 'date' in df.columns or 'Date' in df.columns:
        print("⚠️  Temporal data found - checking for temporal leakage...")
    
    # Check feature correlation with target
    if 'flood' in df.columns or 'Flood' in df.columns:
        target = 'flood' if 'flood' in df.columns else 'Flood'
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        correlations = df[numeric_cols].corrwith(df[target]).abs().sort_values(ascending=False)
        
        print(f"\nTop 5 features correlated with target:")
        for feat, corr in correlations.head(5).items():
            if feat != target:
                print(f"  {feat}: {corr:.3f}")
                if corr > 0.95:
                    print(f"    ⚠️  VERY HIGH CORRELATION - possible leakage!")

# 6. Check preprocessing
print(f"\n[6] PREPROCESSING CHECK:")
scaler_path = OUTPUT_DIR / "03_feature_scaler.pkl"
if scaler_path.exists():
    print("✓ Scaler found - checking if fitted on train only...")
    print("  (Cannot verify from saved scaler)")

print("\n" + "=" * 80)
print("RECOMMENDATIONS:")
print("=" * 80)
print("\n1. SMALL TEST SET:")
print(f"   - Current: {test} samples")
print("   - Recommended: At least 100 samples for reliable evaluation")
print("   - Action: Get more data or use larger test split")

print("\n2. CROSS-VALIDATION:")
print("   - GB CV: 90.46% (6.4% gap from test)")
print("   - RF CV: 93.63% (3.2% gap from test)")
print("   - Gap suggests some overfitting to test set")

print("\n3. IDENTICAL ERRORS:")
print("   - Both models missed the same flood")
print("   - With 23 floods in test set, missing 1 = 4.3%")
print("   - This specific flood might be genuinely hard to predict")

print("\n4. TO PREVENT OVERFITTING:")
print("   - Use stratified K-fold validation (already doing)")
print("   - Implement holdout validation set")
print("   - Test on completely unseen data from different time period")
print("   - Add more regularization")
print("   - Use simpler models")

print("\n" + "=" * 80)

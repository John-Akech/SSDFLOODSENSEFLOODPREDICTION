import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
import joblib

# Load data
df = pd.read_csv('../data/south_sudan_flood_combined_data.csv')
print(f"Loaded {len(df)} samples")

# Select top 10 features
features = ['sar_change', 'pre_flood_precipitation', 'sar_difference',
            'water_occurrence', 'annual_precipitation', 'sar_after',
            'flood_season_precipitation', 'upstream_precipitation',
            'sar_before', 'elevation']

X = df[features]
y = df['flood_occurred']

print(f"Flood cases: {y.sum()}, No flood: {(~y).sum()}")

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Train Random Forest with better parameters
rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=10,
    min_samples_leaf=5,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)

print("Training Random Forest...")
rf.fit(X_train, y_train)

# Calibrate probabilities
print("Calibrating probabilities...")
rf_calibrated = CalibratedClassifierCV(rf, method='sigmoid', cv=5)
rf_calibrated.fit(X_train, y_train)

# Test
from sklearn.metrics import classification_report, roc_auc_score
y_pred = rf_calibrated.predict(X_test)
y_proba = rf_calibrated.predict_proba(X_test)[:, 1]

print("\nPerformance:")
print(classification_report(y_test, y_pred))
print(f"ROC-AUC: {roc_auc_score(y_test, y_proba):.3f}")

# Save
joblib.dump(rf_calibrated, '../models/random_forest.pkl')
print("\n[OK] Model saved to models/random_forest.pkl")

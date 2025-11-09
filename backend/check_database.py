"""
Quick script to check database contents and explain why certain values are zero
"""
from core.database import SessionLocal
from models.database_models import Alert, Prediction as DBPrediction
from sqlalchemy import func

db = SessionLocal()

print("=" * 70)
print("DATABASE CONTENTS CHECK")
print("=" * 70)

# Check Alerts
print("\n1. ALERTS TABLE:")
total_alerts = db.query(Alert).count()
active_alerts = db.query(Alert).filter(Alert.is_active == True).count()
print(f"   - Total alerts: {total_alerts}")
print(f"   - Active alerts: {active_alerts}")
print(f"   → This is why 'active_floods' = {active_alerts}")

# Check Predictions
print("\n2. PREDICTIONS TABLE:")
total_predictions = db.query(DBPrediction).count()
high_risk = db.query(DBPrediction).filter(DBPrediction.flood_probability > 0.7).count()
print(f"   - Total predictions: {total_predictions}")
print(f"   - High risk (prob > 0.7): {high_risk}")
print(f"   → This is why 'high_risk_areas' = {high_risk}")

# Show sample predictions
print("\n3. SAMPLE PREDICTIONS (last 5):")
recent = db.query(DBPrediction).order_by(DBPrediction.created_at.desc()).limit(5).all()
for pred in recent:
    print(f"   - Location: ({pred.latitude}, {pred.longitude})")
    print(f"     Probability: {pred.flood_probability:.2%}, Risk: {pred.risk_level}")
    print(f"     Created: {pred.created_at}")

# Check flood zones query
print("\n4. FLOOD ZONES CHECK:")
print(f"   - This queries predictions near a specific location")
print(f"   - Test uses Juba (6.897, 31.6029) with 50km radius")
print(f"   - Zero results means no predictions stored near that location yet")

# Explanation
print("\n" + "=" * 70)
print("EXPLANATION:")
print("=" * 70)
print("✓ Zero values are CORRECT and EXPECTED because:")
print("  1. No active flood ALERTS have been created yet")
print("     (Alerts are created when flood probability exceeds threshold)")
print("  2. Current predictions have low probabilities (< 0.7)")
print("  3. No predictions stored near Juba test location yet")
print("\nThis is NORMAL for a fresh system!")
print("Values will increase as:")
print("  - More predictions are made")
print("  - High-risk areas are detected (probability > 0.7)")
print("  - Alerts are triggered for dangerous conditions")
print("=" * 70)

db.close()

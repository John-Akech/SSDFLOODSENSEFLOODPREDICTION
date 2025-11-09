"""
Quick test to see if models can be loaded
"""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

print("Testing model loading...")
print("="*70)

# Test 1: Check paths
print("\n1. Checking paths...")
models_dir = backend_path / "ml_pipeline" / "outputs" / "04_trained_models"
print(f"   Models directory: {models_dir}")
print(f"   Exists: {models_dir.exists()}")

if models_dir.exists():
    print(f"   Contents: {list(models_dir.glob('*'))}")

# Test 2: Load Random Forest
print("\n2. Testing Random Forest loading...")
try:
    import joblib
    rf_path = models_dir / "random_forest.pkl"
    print(f"   Path: {rf_path}")
    print(f"   Exists: {rf_path.exists()}")
    
    if rf_path.exists():
        rf_model = joblib.load(rf_path)
        print(f"   ✓ Loaded successfully!")
        print(f"   Type: {type(rf_model)}")
except Exception as e:
    print(f"   ✗ Failed: {e}")

# Test 3: Load scaler
print("\n3. Testing Feature Scaler loading...")
try:
    scaler_path = backend_path / "ml_pipeline" / "outputs" / "03_feature_scaler.pkl"
    print(f"   Path: {scaler_path}")
    print(f"   Exists: {scaler_path.exists()}")
    
    if scaler_path.exists():
        scaler = joblib.load(scaler_path)
        print(f"   ✓ Loaded successfully!")
        print(f"   Type: {type(scaler)}")
except Exception as e:
    print(f"   ✗ Failed: {e}")

# Test 4: Import ModelService
print("\n4. Testing ModelService import...")
try:
    from app.services.model_service import ModelService
    print("   ✓ ModelService imported successfully")
    
    # Try to load models
    print("\n5. Testing ModelService.load_models()...")
    import asyncio
    asyncio.run(ModelService.load_models())
    
    print(f"   Models loaded: {ModelService.models_loaded}")
    print(f"   RF Model: {ModelService.rf_model is not None}")
    print(f"   GB Model: {ModelService.gb_model is not None}")
    print(f"   Scaler: {ModelService.scaler is not None}")
    
except Exception as e:
    print(f"   ✗ Failed: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*70)
print("Test complete!")

import sys
sys.path.insert(0, 'app')
import asyncio
from services.model_service import ModelService

async def test():
    await ModelService.load_models()
    
    # Test different locations
    locations = [
        (4.85, 31.58, "Juba"),
        (6.21, 31.56, "Bor"),
        (9.53, 31.65, "Malakal"),
        (7.01, 31.31, "Test Location")
    ]
    
    print("Testing Model Predictions:\n")
    for lat, lon, name in locations:
        features = ModelService.generate_features_from_location(lat, lon)
        prob, conf, time_ms = ModelService.predict_rf(features)
        risk = ModelService.get_risk_level(prob)
        
        print(f"{name} ({lat}, {lon}):")
        print(f"  Probability: {prob:.1%}")
        print(f"  Confidence: {conf:.1%}")
        print(f"  Risk: {risk}")
        print(f"  Key features: elevation={features['elevation']:.1f}, water_occ={features['water_occurrence']:.1f}")
        print()

asyncio.run(test())

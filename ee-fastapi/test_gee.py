import ee

try:
    ee.Initialize()
    print("✓ GEE initialized successfully")
    print(f"✓ Can access Earth Engine: {ee.Number(1).getInfo()}")
except Exception as e:
    print(f"✗ GEE initialization failed: {e}")

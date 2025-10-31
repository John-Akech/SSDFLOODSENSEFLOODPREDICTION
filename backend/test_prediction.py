import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# Test coordinates for Juba, South Sudan
juba_coords = {"latitude": 4.8517, "longitude": 31.5825}
bor_coords = {"latitude": 6.2073, "longitude": 31.5589}

print("Testing Flood Prediction System\n")

# Test 1: Create prediction for Juba
print("1. Creating prediction for Juba...")
try:
    response = requests.post(
        f"{BASE_URL}/predictions",
        json={
            "latitude": juba_coords["latitude"],
            "longitude": juba_coords["longitude"],
            "model_type": "ensemble",
            "lead_time_hours": 12
        },
        timeout=30
    )
    if response.status_code == 200:
        pred = response.json()
        print(f"   [OK] Prediction created: ID={pred['id']}, Risk={pred['risk_level']}, Probability={pred['flood_probability']:.1%}")
    else:
        print(f"   [FAIL] Failed: {response.status_code} - {response.text}")
except Exception as e:
    print(f"   [FAIL] Error: {e}")

# Test 2: Get system stats
print("\n2. Fetching system statistics...")
try:
    response = requests.get(f"{BASE_URL}/stats/system", timeout=10)
    if response.status_code == 200:
        stats = response.json()
        print(f"   [OK] Total predictions: {stats['total_predictions']}")
        print(f"   [OK] Population at risk by state:")
        for state, pop in stats.get('population_by_state', {}).items():
            print(f"      - {state}: {pop:,} people")
    else:
        print(f"   [FAIL] Failed: {response.status_code}")
except Exception as e:
    print(f"   [FAIL] Error: {e}")

# Test 3: Get active alerts
print("\n3. Checking active alerts...")
try:
    response = requests.get(f"{BASE_URL}/alerts", timeout=10)
    if response.status_code == 200:
        data = response.json()
        print(f"   [OK] Active alerts: {data['count']}")
    else:
        print(f"   [FAIL] Failed: {response.status_code}")
except Exception as e:
    print(f"   [FAIL] Error: {e}")

print("\n[OK] Test complete!")

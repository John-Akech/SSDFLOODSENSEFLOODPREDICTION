#!/usr/bin/env python3
"""
Connection Test Script for FloodSense
Tests database, API, and component communication
"""
import sys
import os
import requests
from urllib.parse import urlparse

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app'))

def test_database_connection():
    """Test database connection"""
    print("\n" + "="*60)
    print("Testing Database Connection")
    print("="*60)
    
    try:
        from app.core.database import engine, SessionLocal
        from app.models.database_models import User, Prediction, Alert
        
        # Test connection
        with engine.connect() as conn:
            print("[OK] Database engine connection: SUCCESS")
        
        # Test query
        db = SessionLocal()
        try:
            user_count = db.query(User).count()
            pred_count = db.query(Prediction).count()
            alert_count = db.query(Alert).count()
            
            print(f"[OK] Database query test: SUCCESS")
            print(f"   - Users in database: {user_count}")
            print(f"   - Predictions in database: {pred_count}")
            print(f"   - Alerts in database: {alert_count}")
        finally:
            db.close()
        
        return True
    except Exception as e:
        print(f"[FAIL] Database connection test: FAILED")
        print(f"   Error: {str(e)}")
        return False

def test_api_endpoints(base_url="http://localhost:8000"):
    """Test API endpoints"""
    print("\n" + "="*60)
    print("Testing API Endpoints")
    print("="*60)
    
    endpoints = [
        ("/", "Root endpoint"),
        ("/health", "Health check"),
        ("/api/v1/users", "Users endpoint"),
        ("/api/v1/predictions", "Predictions endpoint"),
        ("/api/v1/alerts", "Alerts endpoint"),
        ("/api/v1/admin/pending-predictions", "Admin endpoint (requires auth)"),
    ]
    
    success_count = 0
    for endpoint, description in endpoints:
        try:
            url = f"{base_url}{endpoint}"
            response = requests.get(url, timeout=5)
            
            if response.status_code in [200, 401, 403]:  # 401/403 are expected for protected endpoints
                print(f"[OK] {description}: SUCCESS (Status: {response.status_code})")
                success_count += 1
            else:
                print(f"[WARN] {description}: Unexpected status {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"[FAIL] {description}: FAILED (Connection refused - is API running?)")
        except Exception as e:
            print(f"[FAIL] {description}: FAILED ({str(e)})")
    
    print(f"\n   Results: {success_count}/{len(endpoints)} endpoints accessible")
    return success_count == len(endpoints)

def test_cors_config(base_url="http://localhost:8000"):
    """Test CORS configuration"""
    print("\n" + "="*60)
    print("Testing CORS Configuration")
    print("="*60)
    
    test_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:80",
        "https://floodsense.org",
    ]
    
    success_count = 0
    for origin in test_origins:
        try:
            headers = {
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type"
            }
            response = requests.options(f"{base_url}/api/v1/users", headers=headers, timeout=5)
            
            cors_headers = {
                "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
                "Access-Control-Allow-Credentials": response.headers.get("Access-Control-Allow-Credentials"),
            }
            
            if cors_headers["Access-Control-Allow-Origin"]:
                print(f"[OK] CORS for {origin}: CONFIGURED")
                print(f"   Allow-Origin: {cors_headers['Access-Control-Allow-Origin']}")
                success_count += 1
            else:
                print(f"[WARN] CORS for {origin}: NOT CONFIGURED")
        except Exception as e:
            print(f"[FAIL] CORS test for {origin}: FAILED ({str(e)})")
    
    print(f"\n   Results: {success_count}/{len(test_origins)} CORS origins configured")
    return success_count == len(test_origins)

def test_admin_database_access():
    """Test admin dashboard database access"""
    print("\n" + "="*60)
    print("Testing Admin Dashboard Database Access")
    print("="*60)
    
    try:
        from app.core.database import SessionLocal
        from app.models.database_models import User, Prediction, Alert
        
        db = SessionLocal()
        try:
            # Test user queries (admin dashboard needs this)
            users = db.query(User).limit(10).all()
            print(f"[OK] Admin can query users: SUCCESS ({len(users)} users)")
            
            # Test predictions query
            predictions = db.query(Prediction).limit(10).all()
            print(f"[OK] Admin can query predictions: SUCCESS ({len(predictions)} predictions)")
            
            # Test alerts query
            alerts = db.query(Alert).limit(10).all()
            print(f"[OK] Admin can query alerts: SUCCESS ({len(alerts)} alerts)")
            
            return True
        finally:
            db.close()
    except Exception as e:
        print(f"[FAIL] Admin database access test: FAILED")
        print(f"   Error: {str(e)}")
        return False

def main():
    """Run all connection tests"""
    print("\n" + "="*60)
    print("FloodSense Connection Test Suite")
    print("="*60)
    
    results = {
        "database": test_database_connection(),
        "api_endpoints": test_api_endpoints(),
        "cors": test_cors_config(),
        "admin_access": test_admin_database_access(),
    }
    
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    for test_name, result in results.items():
        status = "[PASS]" if result else "[FAIL]"
        print(f"   {test_name}: {status}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n[SUCCESS] All connection tests passed!")
        return 0
    else:
        print("\n[FAIL] Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())


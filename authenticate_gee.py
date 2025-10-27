#!/usr/bin/env python3
"""
Google Earth Engine Authentication Helper
Helps authenticate GEE for the FloodSense application
"""

import os
import subprocess
import sys
import json
from pathlib import Path

def check_gee_auth():
    """Check if GEE is already authenticated"""
    try:
        import ee
        ee.Initialize()
        print("✓ Google Earth Engine is already authenticated")
        return True
    except Exception as e:
        print(f"✗ GEE not authenticated: {e}")
        return False

def authenticate_gee():
    """Authenticate Google Earth Engine"""
    print("🔐 Authenticating Google Earth Engine...")
    print("This will open a browser window for authentication.")
    
    try:
        # Run earthengine authenticate
        result = subprocess.run(
            ["earthengine", "authenticate"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✓ Authentication successful!")
            return True
        else:
            print(f"✗ Authentication failed: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("✗ 'earthengine' command not found.")
        print("Please install the Earth Engine CLI:")
        print("pip install earthengine-api")
        return False

def setup_service_account():
    """Setup service account authentication (optional)"""
    print("\n📋 Service Account Setup (Optional)")
    print("If you have a service account key file, place it at:")
    print("./ee-fastapi/gee-service-account.json")
    
    service_account_path = Path("ee-fastapi/gee-service-account.json")
    if service_account_path.exists():
        print("✓ Service account file found")
        try:
            with open(service_account_path) as f:
                key_data = json.load(f)
            print(f"✓ Service account: {key_data.get('client_email', 'Unknown')}")
        except Exception as e:
            print(f"✗ Invalid service account file: {e}")
    else:
        print("ℹ No service account file found (using personal auth)")

def main():
    """Main authentication flow"""
    print("🌍 FloodSense - Google Earth Engine Authentication")
    print("=" * 50)
    
    # Check if already authenticated
    if check_gee_auth():
        print("✓ No authentication needed")
        setup_service_account()
        return
    
    # Try to authenticate
    print("\n🔑 Starting authentication process...")
    if authenticate_gee():
        print("\n✓ Authentication complete!")
        
        # Verify authentication
        if check_gee_auth():
            print("✓ Verification successful")
        else:
            print("✗ Verification failed")
    else:
        print("\n✗ Authentication failed")
        print("\nTroubleshooting:")
        print("1. Install Earth Engine API: pip install earthengine-api")
        print("2. Run: earthengine authenticate")
        print("3. Follow the browser authentication flow")
    
    setup_service_account()
    
    print("\n🐳 Docker Setup:")
    print("After authentication, restart your Docker containers:")
    print("docker-compose down && docker-compose up -d")

if __name__ == "__main__":
    main()
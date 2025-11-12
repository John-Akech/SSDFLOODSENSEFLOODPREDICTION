#!/bin/bash

# Setup Google Earth Engine Credentials for FloodSense SAR Detection
# This script configures GEE authentication in the production environment

echo "🔧 Setting up Google Earth Engine credentials..."

# Create the credentials directory
mkdir -p /root/.config/earthengine

# Create a credentials file with the service account
# Note: This requires the service account JSON key to be present
if [ -f "/root/gee-service-account.json" ]; then
    echo "✅ Service account key found"
    
    # Set environment variable for Google Application Credentials
    export GOOGLE_APPLICATION_CREDENTIALS="/root/gee-service-account.json"
    
    # Create Earth Engine credentials from service account
    # This uses the gcloud-based authentication flow
    echo "🔐 Authenticating with Earth Engine..."
    
    # For service accounts, we need to use the Python API to authenticate
    python3 -c "
import ee
import json

# Read service account key
with open('/root/gee-service-account.json', 'r') as f:
    credentials = json.load(f)
    project_id = credentials.get('project_id')

try:
    # Initialize with service account
    credentials = ee.ServiceAccountCredentials(
        credentials['client_email'],
        '/root/gee-service-account.json'
    )
    ee.Initialize(credentials, project=project_id)
    print('✅ Earth Engine authentication successful!')
    print(f'📦 Project ID: {project_id}')
except Exception as e:
    print(f'❌ Authentication failed: {e}')
    exit(1)
"
    
    if [ $? -eq 0 ]; then
        echo "✅ GEE credentials configured successfully"
        echo "🔄 Restarting SAR detection service..."
        docker restart floodsense-sar
        echo "✅ Setup complete!"
    else
        echo "❌ Failed to configure GEE credentials"
        exit 1
    fi
else
    echo "❌ Service account key not found at /root/gee-service-account.json"
    echo ""
    echo "📋 To fix this:"
    echo "1. Download your service account key from Google Cloud Console"
    echo "2. Copy it to the server:"
    echo "   scp /path/to/key.json root@159.203.162.85:/root/gee-service-account.json"
    echo "3. Run this script again"
    exit 1
fi

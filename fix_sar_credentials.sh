#!/bin/bash

# Fix SAR Detection Service - Google Earth Engine Credentials Setup
# This script configures GEE authentication for the production environment

set -e

echo "🔧 FloodSense SAR Detection - Credentials Setup"
echo "================================================"
echo ""

# Check if service account key exists locally
if [ ! -f "ee-fastapi/gee-service-account.json" ]; then
    echo "❌ Error: Service account key not found locally"
    echo ""
    echo "📋 Please ensure you have a valid Google Earth Engine service account key:"
    echo "   1. Go to https://console.cloud.google.com/"
    echo "   2. Select project: ace-connection-474712-p1"
    echo "   3. Go to IAM & Admin → Service Accounts"
    echo "   4. Create or select a service account"
    echo "   5. Create and download a JSON key"
    echo "   6. Save it as: ee-fastapi/gee-service-account.json"
    echo ""
    exit 1
fi

echo "✅ Service account key found locally"
echo ""

# Copy the key to the server
echo "📤 Copying service account key to server..."
scp -i "$HOME/.ssh/id_ed25519" \
    "ee-fastapi/gee-service-account.json" \
    "root@159.203.162.85:/root/gee-service-account.json"

if [ $? -eq 0 ]; then
    echo "✅ Service account key copied successfully"
else
    echo "❌ Failed to copy service account key"
    exit 1
fi

echo ""
echo "🔄 Updating deployment configuration..."

# Commit and push changes
git add docker-compose.prod.yml frontend/src/components/EnhancedSidebar.tsx frontend/src/services/api.ts
git commit -m "fix: Configure GEE credentials and update SAR service URLs for production" || true
git push origin master

echo ""
echo "⏳ Waiting for GitHub Actions to rebuild and deploy..."
echo "   Monitor at: https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION/actions"
echo ""
echo "💡 Once deployment completes, the SAR detection service will be fully functional"
echo ""
echo "✅ Setup script completed!"

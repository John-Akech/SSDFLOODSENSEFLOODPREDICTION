#!/bin/bash

# Script to update the FloodSense services on DigitalOcean droplet
# This script should be run on your droplet after pushing new images

echo "================================================"
echo "FloodSense Service Update Script"
echo "================================================"
echo ""

# Navigate to the project directory
cd /root/SSDFLOODSENSEFLOODPREDICTION || {
    echo "Error: Project directory not found!"
    exit 1
}

echo "1. Logging into DigitalOcean registry..."
doctl registry login

echo ""
echo "2. Pulling latest images from registry..."
docker compose -f docker-compose.prod.yml pull

echo ""
echo "3. Stopping current services..."
docker compose -f docker-compose.prod.yml down

echo ""
echo "4. Starting services with new images..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "5. Cleaning up old images..."
docker system prune -a -f

echo ""
echo "6. Checking service status..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "================================================"
echo "Update complete!"
echo "================================================"
echo ""
echo "You can check the logs with:"
echo "  docker compose -f docker-compose.prod.yml logs -f"

#!/bin/bash
# Deployment script for DigitalOcean droplet

echo "Starting deployment..."

# Navigate to project directory
cd /root/SSDFLOODSENSEFLOODPREDICTION || exit 1

# Reset any local changes
echo "Resetting local changes..."
git reset --hard HEAD
git clean -fd

# Pull latest changes
echo "Pulling latest changes from GitHub..."
git pull origin master

# Stop existing containers
echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down

# Rebuild and start containers
echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

# Prune unused images to save space
echo "Pruning unused images..."
docker image prune -f

# Show container status
echo "Container status:"
docker compose -f docker-compose.prod.yml ps

echo "Deployment complete!"
echo "Frontend: http://159.203.162.85"
echo "Backend API: http://159.203.162.85/api/v1 (or :8000)"
echo "SAR Service: http://159.203.162.85/sar (or :8080)"

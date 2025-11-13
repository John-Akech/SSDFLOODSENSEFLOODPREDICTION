#!/bin/bash
# Simple deployment script for DigitalOcean Droplet
# Run this on the droplet: bash /root/SSDFLOODSENSEFLOODPREDICTION/simple_deploy.sh

set -e

echo "========================================="
echo "🚀 FloodSense Deployment Script"
echo "========================================="
echo ""

cd /root/SSDFLOODSENSEFLOODPREDICTION

# Pull images (assuming Docker is already authenticated)
echo "📥 Pulling latest images from registry..."
if docker compose -f docker-compose.prod.yml pull; then
    echo "✅ Images pulled successfully"
else
    echo "❌ Failed to pull images. You may need to authenticate:"
    echo "   Run: docker login registry.digitalocean.com"
    exit 1
fi

echo ""
echo "🛑 Stopping existing services..."
docker compose -f docker-compose.prod.yml down

echo ""
echo "▶️ Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting 10 seconds for services to initialize..."
sleep 10

echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "🧪 Testing Services:"

# Test frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200\|301\|302"; then
    echo "✅ Frontend is responding"
else
    echo "⚠️ Frontend may have issues"
fi

# Test backend
if curl -s http://localhost/api/v1/health 2>&1 | grep -q "healthy\|ok\|status"; then
    echo "✅ Backend API is responding"
else
    echo "⚠️ Backend may have issues"
fi

# Test SAR service
if curl -s http://localhost/sar/health 2>&1 | grep -q "healthy\|ok\|status"; then
    echo "✅ SAR service is responding"
else
    echo "⚠️ SAR service may have issues"
fi

echo ""
echo "📝 Recent logs (last 20 lines per service):"
echo ""
echo "=== BACKEND ==="
docker compose -f docker-compose.prod.yml logs backend --tail=20
echo ""
echo "=== FRONTEND ==="
docker compose -f docker-compose.prod.yml logs frontend --tail=20
echo ""
echo "=== DATABASE ==="
docker compose -f docker-compose.prod.yml logs db --tail=10

echo ""
echo "🧹 Cleaning up old images..."
docker system prune -a -f --volumes=false

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "🌐 Your application is available at:"
echo "   http://159.203.162.85"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "   Check status: docker compose -f docker-compose.prod.yml ps"
echo "   Restart: docker compose -f docker-compose.prod.yml restart"
echo ""

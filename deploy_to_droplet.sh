#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /root/SSDFLOODSENSEFLOODPREDICTION

# Authenticate with DigitalOcean registry
echo "🔑 Authenticating with registry..."
doctl registry login

# Pull latest images
echo "📥 Pulling latest images..."
docker compose -f docker-compose.prod.yml pull

# Stop existing containers
echo "🛑 Stopping existing services..."
docker compose -f docker-compose.prod.yml down

# Start services
echo "▶️ Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Show running containers
echo "📊 Running containers:"
docker compose -f docker-compose.prod.yml ps

# Show logs from the last 20 lines
echo "📝 Recent logs:"
docker compose -f docker-compose.prod.yml logs --tail=20

# Clean up old images
echo "🧹 Cleaning up old images..."
docker system prune -a -f

echo "✅ Deployment complete!"
echo ""
echo "🌐 Services should be available at:"
echo "   Frontend: http://159.203.162.85"
echo "   Backend API: http://159.203.162.85/api/v1"
echo "   SAR Detection: http://159.203.162.85/sar"
echo ""
echo "To check logs, run: docker compose -f docker-compose.prod.yml logs -f"

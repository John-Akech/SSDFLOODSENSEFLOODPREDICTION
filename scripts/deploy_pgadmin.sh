#!/bin/bash
# Deploy pgAdmin to DigitalOcean Droplet

echo "=== Deploying pgAdmin to DigitalOcean ==="
echo ""

# Copy updated docker-compose file
echo "Step 1: Uploading docker-compose.prod.yml..."
scp docker-compose.prod.yml root@159.203.162.85:/root/SSDFLOODSENSEFLOODPREDICTION/

# Deploy pgAdmin
echo "Step 2: Starting pgAdmin container..."
ssh root@159.203.162.85 "cd /root/SSDFLOODSENSEFLOODPREDICTION && docker compose -f docker-compose.prod.yml up -d pgadmin"

echo ""
echo "=== pgAdmin Deployed Successfully! ==="
echo ""
echo "Access your database at: http://159.203.162.85:5050"
echo ""
echo "Login Credentials:"
echo "  Email: admin@floodsense.org"
echo "  Password: admin123"
echo ""
echo "Database Connection Details (Already Configured):"
echo "  Host: floodsense-db"
echo "  Port: 5432"
echo "  Database: floodsense_db"
echo "  Username: floodsense_user"
echo "  Password: floodsense_password"
echo ""

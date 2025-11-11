#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
# Droplet
DROPLET_NAME="floodsense-droplet"
DROPLET_REGION="nyc3"
DROPLET_SIZE="s-2vcpu-4gb" # 4GB RAM, 2vCPUs
DROPLET_IMAGE="docker-20-04"

# Database
DB_NAME="floodsense-db"
DB_ENGINE="pg"
DB_VERSION="14"
DB_SIZE="db-s-1vcpu-1gb" # 1GB RAM, 1vCPU
DB_REGION="nyc3"
DB_NUM_NODES=1

# Container Registry
REGISTRY_NAME="floodsense-registry"
REGISTRY_TIER="basic"

# Firewall
FIREWALL_NAME="floodsense-firewall"

# --- Provisioning ---

echo "Provisioning DigitalOcean resources..."

# Create Droplet
echo "Creating Droplet: $DROPLET_NAME..."
doctl compute droplet create $DROPLET_NAME \
    --region $DROPLET_REGION \
    --size $DROPLET_SIZE \
    --image $DROPLET_IMAGE \
    --wait

# Create Database
echo "Creating Database: $DB_NAME..."
doctl databases create $DB_NAME \
    --engine $DB_ENGINE \
    --version $DB_VERSION \
    --size $DB_SIZE \
    --region $DB_REGION \
    --num-nodes $DB_NUM_NODES \
    --wait

# Create Container Registry
echo "Creating Container Registry: $REGISTRY_NAME..."
doctl registry create $REGISTRY_NAME \
    --subscription-tier $REGISTRY_TIER

# Create Firewall
echo "Creating Firewall: $FIREWALL_NAME..."
DROPLET_ID=$(doctl compute droplet list --format "ID,Name" | grep $DROPLET_NAME | awk '{print $1}')
doctl compute firewall create --name $FIREWALL_NAME \
    --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0" \
    --inbound-rules "protocol:tcp,ports:80,address:0.0.0.0/0" \
    --inbound-rules "protocol:tcp,ports:443,address:0.0.0.0/0" \
    --droplet-ids $DROPLET_ID

echo "All resources provisioned successfully!"

#!/bin/bash
# Startup script for FloodSense backend
# Runs database migrations before starting the API server

set -e  # Exit on error

echo "=================================================="
echo "FloodSense Backend Startup"
echo "=================================================="

# Wait for database to be ready (for PostgreSQL)
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database to be ready..."
    timeout=30
    count=0
    until python -c "import psycopg2; import os; psycopg2.connect(os.environ['DATABASE_URL'])" 2>/dev/null || [ $count -eq $timeout ]; do
        count=$((count + 1))
        echo "Database not ready yet... ($count/$timeout)"
        sleep 1
    done
    
    if [ $count -eq $timeout ]; then
        echo "ERROR: Database connection timeout"
        exit 1
    fi
    
    echo "✓ Database is ready"
fi

# Run database migrations
echo "Running database migrations..."
if python scripts/migrate_add_phone_number.py; then
    echo "✓ Migrations completed successfully"
else
    echo "WARNING: Migration script failed, but continuing startup..."
    echo "The migration may have already been applied."
fi

# Create tables if they don't exist
echo "Initializing database tables..."
python -c "
from app.core.database import engine, Base
from app.models.database_models import *
from app.models.audit_log import *
Base.metadata.create_all(bind=engine)
print('✓ Database tables initialized')
"

echo "=================================================="
echo "Starting API server..."
echo "=================================================="

# Start the API server
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

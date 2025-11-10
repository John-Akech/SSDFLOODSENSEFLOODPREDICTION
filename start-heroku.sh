#!/bin/bash
set -e

echo "============================================="
echo "FloodSense - Starting on Heroku"
echo "============================================="
echo "PORT: ${PORT:-8000}"
echo "ENVIRONMENT: ${ENVIRONMENT:-production}"
echo "============================================="

# Create required directories
mkdir -p /tmp/client_body /tmp/proxy /tmp/fastcgi /tmp/uwsgi /tmp/scgi
mkdir -p database logs models

# Initialize database if needed
echo "Checking database..."
python -c "
from app.database.database import init_db, engine
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
if not tables:
    print('Initializing database...')
    init_db()
    print('Database initialized!')
else:
    print(f'Database ready with {len(tables)} tables')
" || echo "Database check skipped"

# Replace $PORT in nginx config
envsubst '$PORT' < /etc/nginx/nginx.conf > /tmp/nginx.conf

# Start FastAPI backend on internal port 8001
echo "Starting FastAPI backend on port 8001..."
uvicorn app.main:app --host 127.0.0.1 --port 8001 --log-level info &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -f http://127.0.0.1:8001/health > /dev/null 2>&1; then
        echo "✓ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "✗ Backend failed to start!"
        exit 1
    fi
    echo "  Attempt $i/30..."
    sleep 2
done

# Start nginx on Heroku's PORT
echo "Starting nginx on port $PORT..."
nginx -c /tmp/nginx.conf

# Keep the script running and monitor processes
trap 'kill $BACKEND_PID; exit' SIGTERM SIGINT

wait $BACKEND_PID

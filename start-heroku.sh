#!/bin/bash
set -e

echo "Starting FloodSense on Heroku..."
echo "Port: $PORT"

# Start nginx in background
nginx &

# Start FastAPI backend
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT

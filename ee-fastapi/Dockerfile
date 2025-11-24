FROM python:3.11-slim-bookworm AS base

LABEL maintainer="South Sudan Flood Prediction System"
LABEL description="SAR-based flood detection using Google Earth Engine"

# Environment variables
ENV PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100

# Install system dependencies including curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Add a build argument for the base64 encoded service account key
ARG GEE_SERVICE_ACCOUNT_KEY_BASE64

# Create the service account key file from the build argument
RUN if [ -n "$GEE_SERVICE_ACCOUNT_KEY_BASE64" ]; then \
    echo "Creating gee-service-account-key.json from base64 build argument" && \
    echo "$GEE_SERVICE_ACCOUNT_KEY_BASE64" | base64 -d > /app/gee-service-account-key.json; \
    else \
    echo "Build argument GEE_SERVICE_ACCOUNT_KEY_BASE64 not provided, skipping file creation"; \
    fi

# Copy application code (excluding sensitive files via .dockerignore)
COPY . .

# Create output directory
RUN mkdir -p output && chmod 755 output

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4"]

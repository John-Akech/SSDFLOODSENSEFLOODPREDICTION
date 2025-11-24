FROM python:3.11-slim-bookworm AS base

LABEL maintainer="South Sudan Flood Prediction System"
LABEL description="SAR-based flood detection using Google Earth Engine"

# Cache buster for force rebuild
ARG CACHE_BUST=2025-11-24-sar-v3
RUN echo "Cache bust: $CACHE_BUST"

# Environment variables
ENV PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies in ONE step with proper error handling
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Skip GDAL completely - not critical for basic functionality
# If GDAL is needed, install it manually after deployment
RUN echo "GDAL installation skipped for build reliability"

# Create app directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

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

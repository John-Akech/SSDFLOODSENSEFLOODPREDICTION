FROM python:3.11-slim-bookworm AS base

LABEL maintainer="South Sudan Flood Prediction System"
LABEL description="SAR-based flood detection using Google Earth Engine"

# Cache buster for force rebuild
ARG CACHE_BUST=2025-12-02-v1
RUN echo "Cache bust: $CACHE_BUST"

# Environment variables
ENV PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100 \
    DEBIAN_FRONTEND=noninteractive \
    PYTHONPATH=/app

# Create app directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy application code (excluding sensitive files via .dockerignore)
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p output credentials && \
    chmod 755 output && \
    chmod 700 credentials 2>/dev/null || true

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

# Health check that works even during GEE initialization
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health').read()" || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]

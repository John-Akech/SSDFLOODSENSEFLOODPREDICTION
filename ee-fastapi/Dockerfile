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

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4"]

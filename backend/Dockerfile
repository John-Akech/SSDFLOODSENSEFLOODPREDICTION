FROM python:3.11-slim

LABEL maintainer="John Akech <j.akech@alustudent.com>"
LABEL description="FloodSense Backend API - ML Predictions & Alerts"

# Cache buster for forcing rebuilds - This forces Docker to rebuild from this point
ARG CACHE_BUST=2025-11-24-v5
RUN echo "Cache bust: $CACHE_BUST"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DEFAULT_TIMEOUT=300 \
    PIP_RETRIES=5

WORKDIR /app

# Upgrade pip first
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy backend requirements from repo root context
COPY backend/requirements.txt ./requirements.txt

# Install PyTorch first (largest dependency) - CPU version for smaller size
RUN pip install --no-cache-dir --timeout=300 "torch>=2.5.1" --index-url https://download.pytorch.org/whl/cpu || \
    pip install --no-cache-dir --timeout=300 "torch>=2.5.1"

# Install remaining dependencies from requirements.txt
RUN pip install --no-cache-dir --timeout=300 -r requirements.txt

# Copy backend source code
COPY backend/ /app/
# Ship trained model artifacts so containers can predict immediately
COPY models/ /app/models/

RUN mkdir -p database logs && \
    useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

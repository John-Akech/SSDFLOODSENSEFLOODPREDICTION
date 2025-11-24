FROM python:3.11-slim

LABEL maintainer="John Akech <j.akech@alustudent.com>"
LABEL description="FloodSense Backend API - ML Predictions & Alerts"

# Cache buster for forcing rebuilds
ARG CACHE_BUST=2025-11-24-v2

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DEFAULT_TIMEOUT=300 \
    PIP_RETRIES=5

WORKDIR /app

# Install system dependencies that might be needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip first
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy backend requirements from repo root context
COPY backend/requirements.txt ./requirements.txt

# Install PyTorch first (largest dependency) - CPU version for smaller size
RUN pip install --no-cache-dir --timeout=300 torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu || \
    pip install --no-cache-dir --timeout=300 torch==2.5.1

# Install remaining dependencies in chunks to avoid timeout
RUN pip install --no-cache-dir --timeout=300 \
    fastapi==0.110.0 \
    uvicorn[standard]==0.27.1 \
    sqlalchemy==2.0.28 \
    pydantic>=2.6.0 \
    pydantic-settings==2.1.0

RUN pip install --no-cache-dir --timeout=300 \
    pandas==2.2.3 \
    numpy==1.26.4 \
    scikit-learn==1.7.2 \
    joblib==1.3.2 \
    imbalanced-learn==0.12.4

RUN pip install --no-cache-dir --timeout=300 \
    email-validator>=2.0.0 \
    geopy==2.4.1 \
    folium==0.15.1 \
    python-jose[cryptography]==3.3.0 \
    passlib[bcrypt]==1.7.4 \
    python-multipart==0.0.9

RUN pip install --no-cache-dir --timeout=300 \
    pytest==7.4.3 \
    pytest-cov==4.1.0 \
    httpx==0.25.2 \
    earthengine-api==0.1.384 \
    cryptography==41.0.7 \
    psycopg2-binary==2.9.9 \
    pywebpush==2.1.2

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

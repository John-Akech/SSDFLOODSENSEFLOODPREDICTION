# FloodSense: Real-Time Flood Prediction & Early Warning System for South Sudan

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Academic-orange.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)](backend/tests/)

A Machine Learning-Based Flood Forecasting System leveraging Satellite Imagery, Real-Time Environmental Data, and Automated Multi-Channel Alert Mechanisms to Protect Vulnerable Communities in South Sudan

**Academic Capstone Project** | African Leadership University | Software Engineering | 2025

**Demo Video:** [FloodSense System Walkthrough](https://drive.google.com/file/d/1FcEZCI2VdIqJ7eEiZ0mTDhA_bbN8-Rgp/view?usp=sharing)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Achievements](#key-achievements)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
  - [Option 1: Docker (Recommended)](#option-1-docker-recommended)
  - [Option 2: Manual Setup](#option-2-manual-setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Machine Learning Pipeline](#machine-learning-pipeline)
- [Production Deployment](#production-deployment)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License & Contact](#license--contact)

---

## Overview

FloodSense is a comprehensive flood prediction and early warning system designed to address the critical challenge of flood disasters in South Sudan. By integrating satellite remote sensing (Sentinel-1, CHIRPS, MODIS), machine learning algorithms, and real-time multi-channel alert mechanisms (Web Push, SMS, Email), it provides accurate flood predictions and timely warnings to at-risk communities.

### Key Achievements
| Metric | Result | Status |
|--------|--------|--------|
| **Model Accuracy** | **96.88%** | Exceeded Target |
| **Precision** | **100%** | Perfect |
| **Recall** | **95.65%** | High Sensitivity |
| **Prediction Latency** | **< 500ms** | Real-time |
| **Historical Data** | **10 Years** | 2014-2024 |
| **Automated Alerts** | **6-hour cycles** | Multi-channel |

---

## 🏗️ System Architecture

**[View High-Resolution Architecture Diagram](https://drive.google.com/file/d/1UZ5XmmUprbz7Nw3_yiG9reD3pUTrztH4/view?usp=sharing)**

FloodSense implements a modern microservices architecture with clear separation of concerns, ensuring scalability, maintainability, and resilience.

### Architecture Highlights

- **Containerized Deployment:** Docker Compose orchestration for development, Docker Swarm/Kubernetes ready for production
- **API-First Design:** RESTful API with OpenAPI/Swagger documentation
- **Real-Time Processing:** Async/await patterns with FastAPI for non-blocking I/O
- **Microservices Communication:** Internal service mesh with health checks and circuit breakers
- **Data Pipeline:** ETL processes for satellite data ingestion, preprocessing, and model training
- **Security:** JWT authentication, rate limiting, HTTPS enforcement, CORS configuration

**Services:**
- **Frontend:** React 18, TypeScript, Tailwind CSS, Mapbox GL JS
- **Backend:** FastAPI (Python), SQLAlchemy, Pydantic
- **SAR Service:** Google Earth Engine API for Sentinel-1 flood detection
- **Data & ML:** Scikit-learn, PyTorch, PostgreSQL/PostGIS
- **Infrastructure:** Docker, Nginx, DigitalOcean App Platform

---

## 🛠️ Technology Stack

### Backend (API & ML Services)
- **Framework:** FastAPI 0.115+ (Python 3.11+)
- **ML Libraries:** scikit-learn 1.7+, PyTorch 2.5+, imbalanced-learn, XGBoost
- **Data Processing:** pandas 2.2+, numpy 1.26+, geopandas, rasterio
- **Geospatial:** Google Earth Engine API, Sentinel-1/2, CHIRPS, MODIS, ERA5
- **Database:** SQLite (dev), PostgreSQL 15 (prod), SQLAlchemy 2.0+ ORM
- **Authentication:** python-jose (JWT), bcrypt, OAuth2
- **Async:** uvicorn 0.27+, asyncio, httpx
- **Notifications:** pywebpush 2.1+ (Web Push), twilio 8.10+ (SMS), africastalking 1.2+ (SMS)
- **Testing:** pytest 7.4+, pytest-cov, pytest-asyncio, Locust (load testing)

### Frontend (User Interface)
- **Framework:** React 18.2+ with TypeScript 5.0+
- **Build Tool:** Vite 5.0+ (fast HMR, optimized builds)
- **UI Library:** Tailwind CSS 3.4+, Headless UI
- **Mapping:** Leaflet 1.9+, React-Leaflet 4.2+, Leaflet Draw
- **State Management:** Zustand 4.4+
- **Charts:** Recharts 2.12+
- **HTTP Client:** Axios 1.7+
- **Testing:** Jest 29.7+, React Testing Library 14.1+
- **Key Features:**
  - **PWA Support:** Progressive Web App with offline capabilities
  - **Responsive Design:** Mobile-first approach for field usage
  - **Real-time Updates:** Live flood data and alerts

### SAR Service (Satellite Analysis)
- **Framework:** FastAPI 0.104+ (Python 3.11+)
- **Geospatial:** Google Earth Engine API, earthengine-api 0.1+
- **Data Processing:** geopandas, rasterio, Sentinel-1 SAR
- **Storage:** PostgreSQL/PostGIS for spatial data

### DevOps & Infrastructure
- **Containerization:** Docker 24+, Docker Compose
- **Web Server:** Nginx (reverse proxy, static assets)
- **CI/CD:** GitHub Actions (automated testing, deployment to DigitalOcean)
- **Database:** PostgreSQL 15 (managed database on DigitalOcean)
- **Cloud:** DigitalOcean App Platform
- **Monitoring:** Health check endpoints, logging

### Development Tools
- **Version Control:** Git, GitHub
- **Code Quality:** Ruff (linting), Black (formatting), ESLint, Prettier
- **Documentation:** Swagger/OpenAPI, JSDoc, Markdown
- **Environment:** Python venv, npm/Node.js 18+

---

## 📦 Prerequisites

Before installing FloodSense, ensure you have the following software installed on your system:

### Required Software

1. **Docker Desktop** (v24.0 or higher)
   - **Windows:** Download from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - **Mac:** Download from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - **Linux:** Follow instructions at [https://docs.docker.com/engine/install/](https://docs.docker.com/engine/install/)
   - Verify installation: `docker --version` and `docker-compose --version`

2. **Git** (v2.30 or higher)
   - **Windows:** Download from [https://git-scm.com/download/win](https://git-scm.com/download/win)
   - **Mac:** Install via Homebrew: `brew install git` or download from [https://git-scm.com/download/mac](https://git-scm.com/download/mac)
   - **Linux:** `sudo apt-get install git` (Debian/Ubuntu) or `sudo yum install git` (RHEL/CentOS)
   - Verify installation: `git --version`

### Optional (for manual setup without Docker)

3. **Python** (v3.11 or higher)
   - Download from [https://www.python.org/downloads/](https://www.python.org/downloads/)
   - Ensure `pip` is installed: `python --version` and `pip --version`

4. **Node.js** (v18.0 or higher) and npm
   - Download from [https://nodejs.org/](https://nodejs.org/)
   - Verify installation: `node --version` and `npm --version`

5. **PostgreSQL** (v15 or higher) - Only for production-like local setup
   - Download from [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
   - Or use Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15`

### System Requirements

- **RAM:** Minimum 8GB (16GB recommended for ML training)
- **Disk Space:** Minimum 10GB free space
- **OS:** Windows 10/11, macOS 11+, or Linux (Ubuntu 20.04+, Debian 10+, etc.)
- **Internet Connection:** Required for initial setup and Google Earth Engine API calls

---

## 🚀 Installation & Setup

### Option 1: Docker (Recommended)

Docker simplifies the setup process by containerizing all services. This is the **recommended approach** for reviewers and moderators.

#### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION.git

# Navigate to the project directory
cd SSDFLOODSENSEFLOODPREDICTION
```

#### Step 2: Configure Environment Variables

The project includes example environment files. Copy them and customize as needed:

```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
cp frontend/.env.example frontend/.env
```

**Backend `.env` file** (`backend/.env`):
```env
# Database Configuration
DATABASE_URL=sqlite:///./database/floodsense.db  # SQLite for development
# DATABASE_URL=postgresql://user:password@localhost:5432/floodsense  # PostgreSQL for production

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# VAPID Keys for Web Push Notifications (generate using scripts/generate_vapid_keys.py)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@floodsense.org

# SMS Configuration (Optional - for multi-channel alerts)
# Twilio (Global SMS provider)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Africa's Talking (Better coverage for African regions)
AFRICASTALKING_USERNAME=your-africastalking-username
AFRICASTALKING_API_KEY=your-africastalking-api-key

# Email Configuration (Optional - for email alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Service URLs
SAR_SERVICE_URL=http://sar-detection:8080
GEE_SERVICE_URL=http://sar-detection:8080

# Environment
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:80
ALLOWED_HOSTS=localhost,127.0.0.1,backend,testserver
```

**Frontend `.env` file** (`frontend/.env`):
```env
# API Configuration
VITE_API_URL=http://localhost:8000/api/v1
VITE_SAR_URL=http://localhost:8080

# VAPID Public Key (must match backend)
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key

# Mapbox (Optional - for enhanced mapping features)
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

> **Note:** The default configuration uses SQLite for the database and works out-of-the-box. For production, use PostgreSQL.

#### Step 3: Generate VAPID Keys (For Web Push Notifications)

Web Push notifications require VAPID keys for authentication:

```bash
# Navigate to backend directory
cd backend

# Generate VAPID keys
python -c "from pywebpush import webpush; import json; vapid = webpush.WebPushVAPID(); vapid.generate_keys(); print(json.dumps({'public': vapid.public_key, 'private': vapid.private_key}, indent=2))"
```

Copy the generated keys to both `backend/.env` and `frontend/.env`.

#### Step 4: Build and Start Services

```bash
# Return to project root
cd ..

# Build and start all services in detached mode
docker-compose up -d --build
```

This command will:
- Build Docker images for backend, frontend, and SAR service
- Start PostgreSQL database (if using Docker Compose with PostgreSQL)
- Start all services in the background
- Create necessary volumes for data persistence

**Expected Output:**
```
Creating network "ssdfloodsensefloodprediction_default" with the default driver
Creating volume "ssdfloodsensefloodprediction_postgres_data" with default driver
Building backend...
Building frontend...
Building sar-detection...
Creating ssdfloodsensefloodprediction_backend_1   ... done
Creating ssdfloodsensefloodprediction_frontend_1  ... done
Creating ssdfloodsensefloodprediction_sar-detection_1 ... done
```

#### Step 5: Verify Services Are Running

```bash
# Check running containers
docker-compose ps

# Expected output:
# NAME                                    STATUS              PORTS
# ssdfloodsensefloodprediction_backend_1   Up 2 minutes       0.0.0.0:8000->8000/tcp
# ssdfloodsensefloodprediction_frontend_1  Up 2 minutes       0.0.0.0:3000->80/tcp
# ssdfloodsensefloodprediction_sar-detection_1 Up 2 minutes   0.0.0.0:8080->8080/tcp
```

#### Step 6: Initialize Database (First Time Only)

```bash
# Run database migrations and seed data
docker-compose exec backend python scripts/seed_data.py
```

This will:
- Create database tables
- Seed initial data (admin user, sample locations)
- Load pre-trained ML models

#### Step 7: Access the Application

Once all services are running, access the application:

- **Frontend (User Interface):** [http://localhost:3000](http://localhost:3000)
- **Backend API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check:** [http://localhost:8000/health](http://localhost:8000/health)
- **SAR Service Health Check:** [http://localhost:8080/health](http://localhost:8080/health)

**Default Login Credentials:**
- **Email:** `admin@floodsense.org`
- **Password:** `admin123` (change after first login)

---

### Option 2: Manual Setup (Without Docker)

For development or debugging purposes, you can run services manually without Docker.

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env file with your configuration

# Initialize database
python scripts/seed_data.py

# Start the backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend API will be available at [http://localhost:8000](http://localhost:8000).

#### Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env file with your configuration

# Start the development server
npm run dev
```

The frontend will be available at [http://localhost:5173](http://localhost:5173) (Vite's default port).

#### SAR Service Setup

```bash
# Open a new terminal and navigate to SAR service directory
cd ee-fastapi

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure Google Earth Engine credentials
# 1. Create credentials/gee-service-account-key.json with your GEE service account
# 2. Or set GEE_SERVICE_ACCOUNT_KEY_BASE64 environment variable

# Start the SAR service
uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

The SAR service will be available at [http://localhost:8080](http://localhost:8080).

---

## 🏃 Running the Application

### Starting Services (Docker)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f sar-detection
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This deletes all data)
docker-compose down -v
```

### Restarting Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Rebuilding After Code Changes

```bash
# Rebuild and restart all services
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build backend
```

---

## 🧪 Testing

### Backend Tests

The backend includes comprehensive unit and integration tests using pytest.

```bash
# Run all tests with Docker
docker-compose exec backend pytest

# Run tests with coverage report
docker-compose exec backend pytest --cov=app --cov-report=html

# Run specific test file
docker-compose exec backend pytest tests/test_api.py

# Run tests with verbose output
docker-compose exec backend pytest -v

# Run manual setup tests (without Docker)
cd backend
pytest
pytest --cov=app --cov-report=html
```

**Test Coverage:**
- API endpoints (health, predictions, alerts, authentication)
- CRUD operations (users, predictions, alerts, subscriptions)
- ML model loading and inference
- Alert service (Web Push, SMS, Email)
- Feature mapping and preprocessing

### Frontend Tests

```bash
# Run tests with Docker
docker-compose exec frontend npm test

# Run manual setup tests (without Docker)
cd frontend
npm test

# Run with coverage
npm test -- --coverage
```

### Load Testing

FloodSense includes Locust for load testing:

```bash
# Start Locust
cd backend
locust -f ../locustfile.py

# Open browser and navigate to http://localhost:8089
# Configure number of users and spawn rate
# Start load test
```

**Load Test Scenarios:**
- User authentication and registration
- Flood prediction requests
- Real-time alert subscriptions
- Map data fetching

---

## 🤖 Machine Learning Pipeline

FloodSense implements a comprehensive, end-to-end ML pipeline for data extraction, preprocessing, model training, evaluation, and deployment.

### Running the ML Pipeline

The ML pipeline can be executed step-by-step or all at once.

#### Step-by-Step Execution

```bash
# Navigate to backend directory
cd backend

# Step 1: Load and merge datasets
python ml_pipeline/01_load_merge_data.py

# Step 2: Exploratory data analysis and visualization
python ml_pipeline/02_explore_visualize.py

# Step 3: Preprocess data and engineer features
python ml_pipeline/03_preprocess_data.py

# Step 4: Train machine learning models (Random Forest, Gradient Boosting, TCN, LSTM)
python ml_pipeline/04_train_models.py

# Step 5: Evaluate model performance
python ml_pipeline/05_evaluate_tune.py

# Step 6: Compare models and generate metrics
python ml_pipeline/06_compare_models.py

# Step 7: Save the best performing model
python ml_pipeline/07_save_model.py
```

#### Automated Execution

```bash
# Run entire pipeline at once
python ml_pipeline/run_pipeline.py
```

### Pipeline Outputs

The pipeline generates the following artifacts in `backend/ml_pipeline/outputs/`:

- **01_loaded_data/**: Merged datasets from multiple sources
- **02_eda_plots/**: Exploratory data analysis visualizations
- **03_preprocessed_data/**: Feature-engineered datasets ready for training
- **04_trained_models/**: Serialized model files (.pkl, .pt)
- **05_evaluation_metrics/**: Performance metrics, confusion matrices, ROC curves
- **06_model_comparison/**: Comparative analysis of all models
- **07_final_models/**: Production-ready model artifacts

### Model Performance

### Model Performance

| Model | Accuracy | Precision | Recall | F1-Score | AUC-ROC | Training Time |
|-------|----------|-----------|--------|----------|---------|---------------|
| **Random Forest** | 96.88% | 100% | 95.65% | 97.78% | 0.989 | 45s |
| **Gradient Boosting** | 96.88% | 100% | 95.65% | 97.78% | 0.989 | 90s |
| **TCN** | 94.20% | 96.15% | 92.31% | 94.19% | 0.965 | 15min |
| **LSTM** | 93.50% | 95.00% | 91.30% | 93.11% | 0.960 | 20min |

**Best Model:** Random Forest Classifier (96.88% Accuracy) - Currently deployed in production

### Data Sources & Features

| Data Source | Parameters | Temporal Resolution | Spatial Resolution | Purpose |
|------------|------------|---------------------|-------------------|---------|
| **Sentinel-1 SAR** | VV, VH polarization | 12 days | 10m | Flood detection, water extent |
| **CHIRPS** | Precipitation | Daily | 5.5 km | Rainfall patterns, accumulation |
| **MODIS** | NDVI, LST | 8-day/Daily | 250m-1km | Vegetation health, temperature |
| **ERA5** | Temperature, humidity, wind | Hourly | 30 km | Climate reanalysis |
| **DEM (SRTM)** | Elevation | Static | 30m | Topography, slope |
| **Historical Floods** | Ground truth labels | Event-based | Point data | Model training/validation |

### Feature Engineering

**Engineered Features (72 total):**
- Temporal aggregations: 7-day, 14-day, 30-day rolling windows
- Spatial statistics: mean, max, min, std within region buffers
- Derived indices: Water Index (VV/VH), Vegetation Anomaly, Precipitation Anomaly
- Lag features: t-1, t-7, t-14, t-30 days for temporal dependencies
- Domain features: Distance to rivers, elevation percentile, slope gradient

### Model Architecture & Training

#### 1. Random Forest Classifier
```python
RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=10,
    min_samples_leaf=4,
    class_weight='balanced',
    random_state=42
)
```
- **Performance:** 96.88% accuracy, 100% precision, 95.65% recall
- **Training Time:** ~45 seconds on 10,000 samples
- **Inference:** < 50ms per prediction

#### 2. Gradient Boosting Classifier
```python
GradientBoostingClassifier(
    n_estimators=150,
    learning_rate=0.1,
    max_depth=7,
    subsample=0.8,
    random_state=42
)
```
- **Performance:** 96.88% accuracy, matches Random Forest
- **Training Time:** ~90 seconds
- **Inference:** < 100ms per prediction

#### 3. Temporal Convolutional Network (TCN)
```python
TCN(
    input_channels=72,
    output_channels=2,
    num_channels=[32, 64, 128],
    kernel_size=3,
    dropout=0.2
)
```
- **Performance:** 94.2% accuracy (experimental)
- **Training Time:** ~15 minutes (GPU accelerated)
- **Inference:** < 200ms per prediction
- **Advantages:** Captures temporal dependencies, suitable for time-series

### Model Evaluation Metrics

| Model | Accuracy | Precision | Recall | F1-Score | AUC-ROC | Training Time |
|-------|----------|-----------|--------|----------|---------|---------------|
| **Random Forest** | 96.88% | 100% | 95.65% | 97.78% | 0.989 | 45s |
| **Gradient Boosting** | 96.88% | 100% | 95.65% | 97.78% | 0.989 | 90s |
| **TCN** | 94.20% | 96.15% | 92.31% | 94.19% | 0.965 | 15min |

**Confusion Matrix (Random Forest):**
```
                Predicted
                No Flood  Flood
Actual No Flood    155      0
       Flood         1     23
```

### Pipeline Automation

The ML pipeline is fully automated and can be triggered:

1. **Manually (Step-by-Step):**

   ```bash
   # Navigate to backend directory
   cd backend
   
   # Run pipeline steps sequentially
   python ml_pipeline/01_load_merge_data.py    # Load and merge datasets
   python ml_pipeline/02_explore_visualize.py  # Generate EDA plots
   python ml_pipeline/03_preprocess_data.py    # Feature engineering
   python ml_pipeline/04_train_models.py       # Train RF, GBM, TCN models
   python ml_pipeline/05_evaluate_tune.py      # Evaluate model performance
   python ml_pipeline/06_compare_models.py     # Generate comparison metrics
   python ml_pipeline/07_save_model.py         # Serialize best models
   ```

2. **Scheduled:** GitHub Actions workflow runs weekly (Mondays 03:00 UTC)
3. **On-Demand:** Manual workflow dispatch with custom parameters

| Data Source | Parameters | Temporal Resolution | Spatial Resolution | Purpose |
|------------|------------|---------------------|-------------------|---------|
| **Sentinel-1 SAR** | VV, VH polarization | 12 days | 10m | Flood detection, water extent |
| **CHIRPS** | Precipitation | Daily | 5.5 km | Rainfall patterns, accumulation |
| **MODIS** | NDVI, LST | 8-day/Daily | 250m-1km | Vegetation health, temperature |
| **ERA5** | Temperature, humidity, wind | Hourly | 30 km | Climate reanalysis |
| **DEM (SRTM)** | Elevation | Static | 30m | Topography, slope |
| **Historical Floods** | Ground truth labels | Event-based | Point data | Model training/validation |

**Feature Engineering:**
- Temporal aggregations: 7-day, 14-day, 30-day rolling windows
- Spatial statistics: mean, max, min, std within region buffers
- Derived indices: Water Index (VV/VH), Vegetation Anomaly, Precipitation Anomaly
- Lag features: t-1, t-7, t-14, t-30 days for temporal dependencies
- Total engineered features: 72

---

## 🌐 Production Deployment

FloodSense is deployed on DigitalOcean App Platform with automatic deployments from GitHub.

### DigitalOcean Deployment

The application is configured for DigitalOcean using `app-spec.yaml`. Key features:

- **Microservices Architecture:** Separate services for backend, frontend, and SAR detection
- **Managed Database:** PostgreSQL 15
- **Auto-scaling:** Configured for basic-xxs instances (can be scaled up)
- **Health Checks:** Automated health monitoring with gradual startup delays
- **Environment Variables:** Secure secret management
- **Continuous Deployment:** Automatic deployments on push to master branch

### Deployment Checklist

1. **Google Earth Engine Credentials**
   - Set `GEE_SERVICE_ACCOUNT_KEY_BASE64` environment variable with base64-encoded service account JSON
   - Or mount credentials file in `ee-fastapi/credentials/`

2. **Environment Variables**
   - Configure all required environment variables in DigitalOcean App Settings
   - Set `DATABASE_URL` to managed PostgreSQL connection string
   - Configure `SECRET_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
   - Set SMS credentials: `TWILIO_*` or `AFRICASTALKING_*` for multi-channel alerts

3. **Model Artifacts**
   - Ensure trained models are in `models/` directory
   - Models are automatically loaded on startup

4. **Post-Deployment Verification**
   - Check `GET /health` endpoint for backend
   - Check `GET /sar/health` endpoint for SAR service
   - Verify database connectivity
   - Test prediction endpoint
   - Verify automated alert scheduler is running

### Manual Deployment to Other Platforms

#### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml floodsense

# Check services
docker stack services floodsense
```

#### Kubernetes

```bash
# Create namespace
kubectl create namespace floodsense

# Apply configurations
kubectl apply -f k8s/ -n floodsense

# Check deployments
kubectl get pods -n floodsense
```

#### AWS/Azure/GCP

1. Build and push Docker images to container registry
2. Configure managed database (RDS/Azure Database/Cloud SQL)
3. Deploy containers using ECS/App Service/Cloud Run
4. Configure load balancer and SSL certificates
5. Set environment variables in platform's secrets manager

---

## 📚 API Documentation

### Interactive API Documentation

Once the backend is running, access interactive API documentation:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Key API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login (returns JWT token)
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user profile

#### Predictions
- `POST /api/v1/predictions/predict` - Generate flood prediction for location and date
- `GET /api/v1/predictions/` - List all predictions
- `GET /api/v1/predictions/{id}` - Get specific prediction

#### Alerts
- `GET /api/v1/alerts/` - List active alerts
- `POST /api/v1/alerts/` - Create new alert (admin only)
- `GET /api/v1/alerts/{id}` - Get specific alert
- `DELETE /api/v1/alerts/{id}` - Delete alert (admin only)

#### Subscriptions (Web Push)
- `POST /api/v1/subscriptions/` - Subscribe to web push notifications
- `GET /api/v1/subscriptions/` - List user's subscriptions
- `DELETE /api/v1/subscriptions/{id}` - Unsubscribe

#### SMS Notifications
- `POST /api/v1/sms/subscribe` - Subscribe to SMS alerts
- `POST /api/v1/sms/unsubscribe` - Unsubscribe from SMS alerts
- `GET /api/v1/sms/status` - Get SMS subscription status
- `POST /api/v1/sms/test` - Send test SMS (requires authentication)

#### SAR Service
- `POST /sar/detect` - Detect floods using Sentinel-1 SAR imagery
- `GET /sar/history` - Get SAR detection history
- `GET /sar/health` - Check SAR service health and GEE authentication

#### Health Check
- `GET /health` - Backend health status
- `GET /api/v1/health` - Backend health status (with prefix)

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```bash
# Login to get token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@floodsense.org", "password": "admin123"}'

# Use token in subsequent requests
curl -X GET "http://localhost:8000/api/v1/predictions/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Docker Containers Not Starting

**Problem:** Services fail to start or exit immediately

**Solutions:**
```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs sar-detection

# Rebuild containers
docker-compose down
docker-compose up -d --build

# Check Docker resources
docker system df
docker system prune  # Clean up unused resources
```

#### 2. Database Connection Errors

**Problem:** `Could not connect to database` or `database does not exist`

**Solutions:**
```bash
# Check database container is running
docker-compose ps

# Recreate database
docker-compose down -v  # WARNING: Deletes all data
docker-compose up -d

# Run migrations
docker-compose exec backend python scripts/seed_data.py
```

#### 3. Model Loading Errors

**Problem:** `Model file not found` or `Failed to load model`

**Solutions:**
```bash
# Verify models exist
ls -la models/

# Retrain models if missing
cd backend
python ml_pipeline/run_pipeline.py

# Copy models to correct location
cp backend/ml_pipeline/outputs/04_trained_models/* models/
```

#### 4. Google Earth Engine Authentication Errors

**Problem:** `EE service failed to initialize` or `Invalid service account`

**Solutions:**
```bash
# Verify GEE credentials exist
ls -la ee-fastapi/credentials/

# Check base64 encoding
cat ee-fastapi/credentials/gee_service_account_base64.txt

# Re-encode if needed
base64 -i ee-fastapi/credentials/gee-service-account-key.json > ee-fastapi/credentials/gee_service_account_base64.txt

# Set environment variable
export GEE_SERVICE_ACCOUNT_KEY_BASE64=$(cat ee-fastapi/credentials/gee_service_account_base64.txt)
```

#### 5. Port Already in Use

**Problem:** `Port 8000/3000/8080 is already in use`

**Solutions:**
```bash
# Find process using the port (Linux/Mac)
lsof -i :8000
lsof -i :3000
lsof -i :8080

# Find process using the port (Windows PowerShell)
netstat -ano | findstr :8000
netstat -ano | findstr :3000
netstat -ano | findstr :8080

# Kill process or change port in docker-compose.yml
# Update ports section:
# ports:
#   - "8001:8000"  # Map to different host port
```

#### 6. Frontend Not Loading or Shows API Errors

**Problem:** Frontend loads but cannot connect to backend

**Solutions:**
```bash
# Check backend is running
curl http://localhost:8000/health

# Verify environment variables in frontend/.env
cat frontend/.env
# Ensure VITE_API_URL=http://localhost:8000/api/v1

# Check CORS settings in backend/.env
# Ensure CORS_ORIGINS includes http://localhost:3000

# Rebuild frontend
docker-compose up -d --build frontend
```

#### 7. SMS/Email Notifications Not Working

**Problem:** Alerts generated but no SMS/Email received

**Solutions:**
```bash
# Check SMS credentials are set
docker-compose exec backend printenv | grep TWILIO
docker-compose exec backend printenv | grep AFRICASTALKING

# Test SMS delivery
curl -X POST "http://localhost:8000/api/v1/sms/test" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+211123456789"}'

# Check backend logs for SMS errors
docker-compose logs -f backend | grep SMS
```

#### 8. Performance Issues

**Problem:** Predictions taking too long or application slow

**Solutions:**
```bash
# Check resource usage
docker stats

# Increase Docker resources in Docker Desktop settings
# Memory: 8GB+ recommended
# CPUs: 4+ cores recommended

# Scale services (Docker Swarm/Kubernetes)
docker service scale floodsense_backend=3

# Optimize database queries (add indexes)
docker-compose exec backend python -c "from app.models import database_models; database_models.create_indexes()"
```

#### 9. Tests Failing

**Problem:** `pytest` tests fail

**Solutions:**
```bash
# Run tests with verbose output
docker-compose exec backend pytest -v

# Check test dependencies
docker-compose exec backend pip list

# Recreate test database
docker-compose exec backend pytest --create-db

# Run specific failing test
docker-compose exec backend pytest tests/test_api.py::test_health_check -v
```

#### 10. Deployment Issues on DigitalOcean

**Problem:** Deployment fails or services crash

**Solutions:**
```bash
# Check build logs in DigitalOcean console

# Verify environment variables are set correctly

# Check health check delays are sufficient
# backend: initial_delay_seconds: 60
# sar-detection: initial_delay_seconds: 90

# Verify database connection string format
# postgresql://username:password@host:port/database?sslmode=require

# Check instance size is sufficient
# Minimum: basic-xxs for dev
# Recommended: basic-xs or higher for production
```

### Getting Help

If you encounter issues not covered here:

1. Check the [Issues](https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION/issues) page
2. Review backend logs: `docker-compose logs -f backend`
3. Check API documentation: `http://localhost:8000/docs`
4. Contact maintainer: johnakec12@gmail.com

---

## 📂 Project Structure

```
SSDFLOODSENSEFLOODPREDICTION/
├── backend/                    # FastAPI backend application
│   ├── app/
│   │   ├── api/               # API route handlers
│   │   │   ├── auth_routes.py
│   │   │   ├── prediction_routes.py
│   │   │   ├── alert_routes.py
│   │   │   ├── subscription_routes.py
│   │   │   └── sms_routes.py
│   │   ├── core/              # Core functionality
│   │   │   ├── config.py      # Configuration settings
│   │   │   ├── security.py    # Authentication and security
│   │   │   └── database.py    # Database connection
│   │   ├── models/            # Data models
│   │   │   └── database_models.py  # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   │   └── schemas.py     # Request/response schemas
│   │   ├── services/          # Business logic
│   │   │   ├── prediction_service.py
│   │   │   ├── alert_service.py
│   │   │   ├── sms_service.py
│   │   │   └── automated_alert_scheduler.py
│   │   ├── utils/             # Utility functions
│   │   │   └── feature_mapping.py
│   │   └── main.py            # Application entry point
│   ├── ml_pipeline/           # Machine learning pipeline
│   │   ├── 01_load_merge_data.py
│   │   ├── 02_explore_visualize.py
│   │   ├── 03_preprocess_data.py
│   │   ├── 04_train_models.py
│   │   ├── 05_evaluate_tune.py
│   │   ├── 06_compare_models.py
│   │   ├── 07_save_model.py
│   │   ├── run_pipeline.py
│   │   └── outputs/           # Pipeline outputs
│   ├── scripts/               # Utility scripts
│   │   ├── seed_data.py       # Database seeding
│   │   ├── check_alerts.py
│   │   └── verify_dynamic_data.py
│   ├── tests/                 # Unit and integration tests
│   │   ├── conftest.py
│   │   ├── test_api.py
│   │   ├── test_crud.py
│   │   ├── test_alert_service.py
│   │   └── test_feature_mapping.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API services
│   │   ├── utils/             # Utility functions
│   │   ├── App.tsx            # Main App component
│   │   └── main.tsx           # Application entry point
│   ├── public/                # Static assets
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── ee-fastapi/                # Google Earth Engine SAR service
│   ├── src/
│   │   ├── sar_flood_mapping.py  # SAR processing logic
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── model.py
│   │   └── utils.py
│   ├── credentials/           # GEE credentials
│   ├── app.py                 # FastAPI application
│   ├── Dockerfile
│   └── requirements.txt
├── data/                      # Datasets
│   ├── flood_training_data_full_20251109.csv
│   ├── model_ready_flood_data.csv
│   └── original_gee_data_2019_2024/
├── models/                    # Trained ML models
│   ├── random_forest_model.pkl
│   ├── gradient_boosting_model.pkl
│   ├── tcn_model.pt
│   ├── lstm_model.pt
│   ├── feature_scaler_pipeline_*.pkl
│   └── feature_names_pipeline_*.json
├── notebooks/                 # Jupyter notebooks
│   ├── complete_flood_prediction_workflow.ipynb
│   └── flood_prediction_ml_workflow.ipynb
├── scripts/                   # Project-level scripts
│   ├── generate_vapid_keys.py
│   └── health_check.py
├── docker-compose.yml         # Docker Compose configuration
├── app-spec.yaml              # DigitalOcean App Platform configuration
├── locustfile.py              # Load testing configuration
└── README.md                  # This file
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
   ```bash
   # Click "Fork" button on GitHub
   git clone https://github.com/YOUR_USERNAME/SSDFLOODSENSEFLOODPREDICTION.git
   cd SSDFLOODSENSEFLOODPREDICTION
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Write clean, documented code
   - Follow existing code style (Ruff for Python, ESLint for TypeScript)
   - Add tests for new features
   - Update documentation as needed

4. **Test your changes**
   ```bash
   # Backend tests
   docker-compose exec backend pytest

   # Frontend tests
   docker-compose exec frontend npm test

   # Lint code
   docker-compose exec backend ruff check .
   docker-compose exec frontend npm run lint
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Use conventional commit messages:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `test:` Adding or updating tests
   - `refactor:` Code refactoring
   - `style:` Formatting changes
   - `chore:` Maintenance tasks

6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Describe your changes in detail
   - Link related issues

### Code Style Guidelines

**Python:**
- Follow PEP 8
- Use type hints
- Write docstrings for functions and classes
- Maximum line length: 100 characters

**TypeScript/React:**
- Use functional components with hooks
- Follow React best practices
- Use TypeScript strict mode
- Write JSDoc comments for complex functions

### Reporting Issues

When reporting issues, include:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Docker version, etc.)
- Logs and error messages
- Screenshots if applicable

---

## 📜 License & Contact

### License

This project is licensed under the **MIT License** for academic and non-commercial use. See [LICENSE](LICENSE) for details.

For commercial use, please contact the project maintainer.

### Citation

If you use FloodSense in your research, please cite:

```bibtex
@software{akech2025floodsense,
  title={FloodSense: Real-Time Flood Prediction and Early Warning System for South Sudan},
  author={Akech, John},
  year={2025},
  institution={African Leadership University},
  url={https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION}
}
```

### Contact

**Project Maintainer:**
- **Name:** John Akech
- **Email:** johnakec12@gmail.com
- **GitHub:** [@John-Akech](https://github.com/John-Akech)
- **LinkedIn:** [john-akech](https://linkedin.com/in/john-akech)

**Institution:** African Leadership University

**Project Links:**
- **Repository:** [https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION](https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION)
- **Demo Video:** [FloodSense System Walkthrough](https://drive.google.com/file/d/1FcEZCI2VdIqJ7eEiZ0mTDhA_bbN8-Rgp/view?usp=sharing)
- **Architecture Diagram:** [System Architecture](https://drive.google.com/file/d/1UZ5XmmUprbz7Nw3_yiG9reD3pUTrztH4/view?usp=sharing)

---

## 🙏 Acknowledgments

- **African Leadership University** for academic support
- **Google Earth Engine** for satellite data access
- **DigitalOcean** for cloud infrastructure
- **Open Source Community** for amazing tools and libraries
- **South Sudan Government** for collaboration and data access
- **Local Communities** for ground truth validation and feedback

---

## 📊 Project Status

**Current Version:** 1.0.0

**Status:** ✅ Production Ready

**Last Updated:** December 2025

**Deployment:** 
- **Production:** [https://floodsense-app-6a3uy.ondigitalocean.app](https://floodsense-app-6a3uy.ondigitalocean.app)
- **Demo:** Available on request

---

## 🚀 Future Enhancements

- [ ] Mobile application (iOS/Android)
- [ ] WhatsApp integration for alerts
- [ ] Integration with more satellite data sources
- [ ] Advanced ML models (Transformer-based, Graph Neural Networks)
- [ ] Multi-language support (Arabic, Dinka, Nuer)
- [ ] Offline-first mobile app for remote areas
- [ ] Integration with national early warning systems
- [ ] Real-time sensor data integration
- [ ] Community reporting features
- [ ] Historical flood archive and analytics dashboard

---

**Built with ❤️ for the people of South Sudan**

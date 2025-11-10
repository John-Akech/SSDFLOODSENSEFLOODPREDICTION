# FloodSense - South Sudan Flood Prediction System

A Real-Time Flood Forecasting and Early Warning System using satellite imagery, machine learning, and automated alerts to protect communities from floods.

**Watch the Demo Video:** [FloodSense System Demo](https://drive.google.com/file/d/1FcEZCI2VdIqJ7eEiZ0mTDhA_bbN8-Rgp/view?usp=sharing)

---

## Quick Stats

| Metric | Achievement |
| :--- | :--- |
| **Model Accuracy** | 96.88% (exceeds 86% target) |
| **Precision** | 100% (zero false alarms) |
| **Recall** | 95.65% (only 1 missed flood) |
| **Prediction Speed** | <500ms response time |
| **Test Coverage** | 100% (14/14 endpoints passing) |
| **Data Sources** | Real satellite data (2014-2024) |

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation Guide](#installation-guide)
  - [Prerequisites](#prerequisites)
  - [Docker Installation (Recommended)](#docker-installation-recommended)
  - [Manual Installation](#manual-installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Machine Learning Pipeline](#machine-learning-pipeline)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Contact](#contact)

---

## Overview

This system predicts floods in South Sudan using satellite imagery and machine learning. It addresses the challenge of limited ground-based monitoring infrastructure by leveraging freely available satellite data.

### Key Features

- **Three ML Models**: Gradient Boosting (96.88% accuracy), Random Forest (96.88% accuracy), and an experimental TCN.
- **Real-time Predictions**: Sub-second response time with confidence scoring.
- **Automated Alerts**: Push notifications and email alerts to affected communities.
- **Interactive Maps**: Visual representation of flood risk zones.
- **Complete API**: 14 tested endpoints with JWT authentication.
- **Production Ready**: Fully containerized with Docker and includes a production-ready deployment guide.

---

## Technology Stack

- **Backend**: FastAPI, Uvicorn, SQLAlchemy, Pydantic, python-jose
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Mapbox GL
- **Machine Learning**: scikit-learn, PyTorch, imbalanced-learn, pandas, joblib
- **Database**: PostgreSQL (Production), SQLite (Development)
- **DevOps**: Docker, Docker Compose, Nginx
- **GIS**: Folium, Geopy

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Client Applications                         │
│  (Web Browser, Mobile browser, NGO Dashboard, Community Portal)    │
└────────────────────────┬───────────────────────────────────────┘
                         │ HTTPS/REST API
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (Async)                       │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────┐  ┌─────────┐  ┌──────────────┐│
│  │   Auth   │  │ Predictions │  │   GIS   │  │    Alert     ││
│  │ Service  │  │   Service   │  │ Service │  │   Service    ││
│  └──────────┘  └─────────────┘  └─────────┘  └──────────────┘│
└────────────────────────┬───────────────────────────────────────┘
         ┌───────────────┼────────────────┐
         ▼               ▼                ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│   Database   │  │  ML Models  │  │  GEE Data    │
│  (PostgreSQL/│  │  (3 Types)  │  │  Pipeline    │
│   SQLite)    │  │             │  │              │
└──────────────┘  └─────────────┘  └──────────────┘
```

---

## Installation Guide

### Prerequisites

- [Git](https://git-scm.com/downloads)
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/)
- [Python 3.11+](https://www.python.org/downloads/) (for manual setup)
- [Node.js & npm](https://nodejs.org/) (for manual setup)
- 4GB RAM minimum (8GB recommended)

### Docker Installation (Recommended)

This is the simplest way to get the entire system running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION.git
    cd SSDFLOODSENSEFLOODPREDICTION
    ```

2.  **Configure Environment Variables:**
    Copy the example environment file.
    ```bash
    cp .env.example .env
    ```
    Now, edit the `.env` file with your settings (database credentials, SMTP server for emails, JWT secret key, etc.).

3.  **Build and Start Services:**
    This command builds the Docker images and starts all containers in the background.
    ```bash
    docker-compose up -d --build
    ```

4.  **Initialize the Database:**
    Run the database creation script inside the running backend container.
    ```bash
    docker-compose exec backend python create_db.py
    ```
    You should see a confirmation that tables were created and initial data was loaded.

### Manual Installation

For development and debugging outside of Docker.

1.  **Backend Setup:**
    ```bash
    cd backend
    python -m venv venv
    # Activate virtual environment
    # Windows:
    venv\Scripts\activate
    # macOS/Linux:
    source venv/bin/activate
    pip install -r requirements.txt
    # Configure .env file in this directory
    python create_db.py
    # Start the server
    uvicorn app.main:app --reload
    ```

2.  **Frontend Setup:**
    ```bash
    cd frontend
    npm install
    # Create a .env file and set VITE_API_URL=http://localhost:8000
    npm run dev
    ```

---

## Usage

-   **Access the Frontend**: [http://localhost](http://localhost)
-   **Access the API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
-   **Check System Health**: [http://localhost:8000/health](http://localhost:8000/health)

To stop all services (if using Docker):
```bash
docker-compose down
```

---

## API Documentation

The API is self-documenting. Visit [http://localhost:8000/docs](http://localhost:8000/docs) for an interactive Swagger UI.

### Example: Single Prediction
```bash
curl -X POST "http://localhost:8000/api/v1/predictions" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "latitude": 6.877,
           "longitude": 31.307,
           "model_type": "gradient_boosting"
         }'
```

---

## Machine Learning Pipeline

The project includes a fully automated, 8-step ML pipeline for data processing, training, evaluation, and deployment.

-   **Location**: `backend/ml_pipeline/`
-   **To Run**: `python run_pipeline.py`
-   **Features**: Extracts data from Google Earth Engine, preprocesses it, trains models, evaluates performance, and deploys the best model to production.
-   **Documentation**: See `backend/ml_pipeline/README.md` for a detailed technical overview.

---

## Project Structure

```
SSDFLOODSENSEFLOODPREDICTION/
├── backend/              # FastAPI application
│   ├── app/              # Core application logic, API routes, services
│   ├── ml_pipeline/      # Automated machine learning pipeline
│   ├── scripts/          # Utility and verification scripts
│   └── tests/            # Pytest test suite
├── data/                 # Training and validation datasets (.csv)
├── ee-fastapi/           # SAR detection microservice
├── frontend/             # React application source code
├── models/               # Deployed (production) ML models
├── .env.example          # Environment variable template
├── docker-compose.yml    # Docker service orchestration
└── README.md             # This file
```

---

## Contributing

Contributions are welcome. Please follow these steps:

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/new-feature`).
3.  Commit your changes (`git commit -m 'Add new feature'`).
4.  Push to the branch (`git push origin feature/new-feature`).
5.  Open a Pull Request.

Please add tests for new features and follow the existing code style.

---

## Contact

**Developer**: John Akech
**Email**: johnakec12@gmail.com
**Repository**: [github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION](https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION)
```// filepath: c:\Users\johna\Desktop\Pictures\CAPSTONEPROJECT\README.md
# FloodSense - South Sudan Flood Prediction System

A Real-Time Flood Forecasting and Early Warning System using satellite imagery, machine learning, and automated alerts to protect communities from floods.

**Watch the Demo Video:** [FloodSense System Demo](https://drive.google.com/file/d/1FcEZCI2VdIqJ7eEiZ0mTDhA_bbN8-Rgp/view?usp=sharing)

---

## Quick Stats

| Metric | Achievement |
| :--- | :--- |
| **Model Accuracy** | 96.88% (exceeds 86% target) |
| **Precision** | 100% (zero false alarms) |
| **Recall** | 95.65% (only 1 missed flood) |
| **Prediction Speed** | <500ms response time |
| **Test Coverage** | 100% (14/14 endpoints passing) |
| **Data Sources** | Real satellite data (2014-2024) |

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation Guide](#installation-guide)
  - [Prerequisites](#prerequisites)
  - [Docker Installation (Recommended)](#docker-installation-recommended)
  - [Manual Installation](#manual-installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Machine Learning Pipeline](#machine-learning-pipeline)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Contact](#contact)

---

## Overview

This system predicts floods in South Sudan using satellite imagery and machine learning. It addresses the challenge of limited ground-based monitoring infrastructure by leveraging freely available satellite data.

### Key Features

- **Three ML Models**: Gradient Boosting (96.88% accuracy), Random Forest (96.88% accuracy), and an experimental TCN.
- **Real-time Predictions**: Sub-second response time with confidence scoring.
- **Automated Alerts**: Push notifications and email alerts to affected communities.
- **Interactive Maps**: Visual representation of flood risk zones.
- **Complete API**: 14 tested endpoints with JWT authentication.
- **Production Ready**: Fully containerized with Docker and includes a production-ready deployment guide.

---

## Technology Stack

- **Backend**: FastAPI, Uvicorn, SQLAlchemy, Pydantic, python-jose
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Mapbox GL
- **Machine Learning**: scikit-learn, PyTorch, imbalanced-learn, pandas, joblib
- **Database**: PostgreSQL (Production), SQLite (Development)
- **DevOps**: Docker, Docker Compose, Nginx
- **GIS**: Folium, Geopy

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Client Applications                         │
│  (Web Browser, Mobile App, NGO Dashboard, Community Portal)    │
└────────────────────────┬───────────────────────────────────────┘
                         │ HTTPS/REST API
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (Async)                       │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────┐  ┌─────────┐  ┌──────────────┐│
│  │   Auth   │  │ Predictions │  │   GIS   │  │    Alert     ││
│  │ Service  │  │   Service   │  │ Service │  │   Service    ││
│  └──────────┘  └─────────────┘  └─────────┘  └──────────────┘│
└────────────────────────┬───────────────────────────────────────┘
         ┌───────────────┼────────────────┐
         ▼               ▼                ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│   Database   │  │  ML Models  │  │  GEE Data    │
│  (PostgreSQL/│  │  (3 Types)  │  │  Pipeline    │
│   SQLite)    │  │             │  │              │
└──────────────┘  └─────────────┘  └──────────────┘
```

---

## Installation Guide

### Prerequisites

- [Git](https://git-scm.com/downloads)
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/)
- [Python 3.11+](https://www.python.org/downloads/) (for manual setup)
- [Node.js & npm](https://nodejs.org/) (for manual setup)
- 4GB RAM minimum (8GB recommended)

### Docker Installation (Recommended)

This is the simplest way to get the entire system running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION.git
    cd SSDFLOODSENSEFLOODPREDICTION
    ```

2.  **Configure Environment Variables:**
    Copy the example environment file.
    ```bash
    cp .env.example .env
    ```
    Now, edit the `.env` file with your settings (database credentials, SMTP server for emails, JWT secret key, etc.).

3.  **Build and Start Services:**
    This command builds the Docker images and starts all containers in the background.
    ```bash
    docker-compose up -d --build
    ```

4.  **Initialize the Database:**
    Run the database creation script inside the running backend container.
    ```bash
    docker-compose exec backend python create_db.py
    ```
    You should see a confirmation that tables were created and initial data was loaded.

### Manual Installation

For development and debugging outside of Docker.

1.  **Backend Setup:**
    ```bash
    cd backend
    python -m venv venv
    # Activate virtual environment
    # Windows:
    venv\Scripts\activate
    # macOS/Linux:
    source venv/bin/activate
    pip install -r requirements.txt
    # Configure .env file in this directory
    python create_db.py
    # Start the server
    uvicorn app.main:app --reload
    ```

2.  **Frontend Setup:**
    ```bash
    cd frontend
    npm install
    # Create a .env file and set VITE_API_URL=http://localhost:8000
    npm run dev
    ```

---

## Usage

-   **Access the Frontend**: [http://localhost](http://localhost)
-   **Access the API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
-   **Check System Health**: [http://localhost:8000/health](http://localhost:8000/health)

To stop all services (if using Docker):
```bash
docker-compose down
```

---

## API Documentation

The API is self-documenting. Visit [http://localhost:8000/docs](http://localhost:8000/docs) for an interactive Swagger UI.

### Example: Single Prediction
```bash
curl -X POST "http://localhost:8000/api/v1/predictions" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "latitude": 6.877,
           "longitude": 31.307,
           "model_type": "gradient_boosting"
         }'
```

---

## Machine Learning Pipeline

The project includes a fully automated, 8-step ML pipeline for data processing, training, evaluation, and deployment.

-   **Location**: `backend/ml_pipeline/`
-   **To Run**: `python run_pipeline.py`
-   **Features**: Extracts data from Google Earth Engine, preprocesses it, trains models, evaluates performance, and deploys the best model to production.
-   **Documentation**: See `backend/ml_pipeline/README.md` for a detailed technical overview.

---

## Project Structure

```
SSDFLOODSENSEFLOODPREDICTION/
├── backend/              # FastAPI application
│   ├── app/              # Core application logic, API routes, services
│   ├── ml_pipeline/      # Automated machine learning pipeline
│   ├── scripts/          # Utility and verification scripts
│   └── tests/            # Pytest test suite
├── data/                 # Training and validation datasets (.csv)
├── ee-fastapi/           # SAR detection microservice
├── frontend/             # React application source code
├── models/               # Deployed (production) ML models
├── .env.example          # Environment variable template
├── docker-compose.yml    # Docker service orchestration
└── README.md             # This file
```

---

## Contributing

Contributions are welcome. Please follow these steps:

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/new-feature`).
3.  Commit your changes (`git commit -m 'Add new feature'`).
4.  Push to the branch (`git push origin feature/new-feature`).
5.  Open a Pull Request.

Please add tests for new features and follow the existing code style.

---

## Contact

**Developer**: John Akech
**Email**: johnakec12@gmail.com
**Repository**: [github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION](https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION)

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
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation Guide](#installation-guide)
  - [Prerequisites](#prerequisites)
  - [Docker Installation (Recommended)](#docker-installation-recommended)
  - [Manual Installation](#manual-installation)
- [Usage](#usage)
- [Machine Learning Pipeline](#machine-learning-pipeline)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Contact](#contact)

---

## Overview

This system predicts floods in South Sudan using satellite imagery and machine learning. It addresses the challenge of limited ground-based monitoring infrastructure by leveraging freely available satellite data.

### Key Features

- **Three ML Models**: Gradient Boosting (96.88% accuracy), Random Forest (96.88% accuracy), and an experimental TCN
- **Real-time Predictions**: Sub-second response time with confidence scoring
- **Automated Alerts**: Push notifications and email alerts to affected communities
- **Interactive Maps**: Visual representation of flood risk zones using satellite imagery
- **SAR Detection**: Synthetic Aperture Radar-based flood detection using Google Earth Engine
- **Production Ready**: Fully containerized with Docker for easy deployment

---

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Mapbox GL
- **Machine Learning**: scikit-learn, PyTorch, imbalanced-learn, pandas
- **SAR Processing**: Google Earth Engine, Sentinel-1 satellite data
- **DevOps**: Docker, Docker Compose, Nginx
- **GIS**: Folium, Geopy

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Client Applications                         │
│         (Web Browser, Mobile, NGO Dashboard)                    │
└────────────────────────┬───────────────────────────────────────┘
                         │ HTTPS/REST
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                   Application Layer                             │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────┐  ┌─────────┐  ┌──────────────┐│
│  │   Auth   │  │ Predictions │  │   GIS   │  │    Alert     ││
│  │ Service  │  │   Service   │  │ Service │  │   Service    ││
│  └──────────┘  └─────────────┘  └─────────┘  └──────────────┘│
└────────────────────────┬───────────────────────────────────────┘
         ┌───────────────┼────────────────┐
         ▼               ▼                ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│   Storage    │  │  ML Models  │  │  GEE Data    │
│    Layer     │  │  (3 Types)  │  │  Pipeline    │
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

This is the simplest way to get the system running locally.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION.git
    cd SSDFLOODSENSEFLOODPREDICTION
    ```

2.  **Configure Environment Variables:**
    Copy the example environment file and edit with your settings.
    ```bash
    cp .env.example .env
    # Edit .env with your preferred text editor
    ```

3.  **Build and Start Services:**
    This command builds the Docker images and starts all containers.
    ```bash
    docker-compose up -d --build
    ```

4.  **Access the Application:**
    - Open your browser to [http://localhost](http://localhost)
    - Wait 30-60 seconds for all services to initialize

### Manual Installation

For development and debugging outside of Docker.

1.  **Frontend Setup:**
    ```bash
    cd frontend
    npm install
    # Configure environment variables
    npm run dev
    ```

2.  **SAR Detection Service:**
    ```bash
    cd ee-fastapi
    pip install -r requirements.txt
    # Configure Google Earth Engine credentials
    python app.py
    ```

---

## Usage

### Local Development
-   **Application**: [http://localhost](http://localhost)
-   **Production**: Contact the system administrator for production access

### Main Features

**1. Flood Risk Prediction**
- Enter coordinates (latitude/longitude) or click on the map
- Select prediction model (Gradient Boosting recommended)
- View flood probability and risk assessment

**2. SAR Flood Detection**
- Satellite-based flood mapping using Sentinel-1 radar
- Real-time flood extent visualization
- Historical flood event comparison

**3. Alert System**
- Automated notifications for high-risk areas
- Email and push notification support
- Community alert management

**4. Data Visualization**
- Interactive maps with flood risk zones
- Historical flood event overlays
- Risk assessment charts and graphs

### Docker Commands

Stop all services:
```bash
docker-compose down
```

View service logs:
```bash
docker-compose logs -f [service-name]
```

Restart services:
```bash
docker-compose restart
```

---

## Machine Learning Pipeline

The project includes a fully automated, 8-step ML pipeline for data processing, training, evaluation, and deployment.

-   **Location**: `backend/ml_pipeline/`
-   **Features**: 
    - Extracts satellite data from Google Earth Engine
    - Preprocesses environmental features (rainfall, temperature, NDVI, etc.)
    - Trains multiple ML models with hyperparameter tuning
    - Evaluates performance and selects best model
    - Deploys production model automatically

-   **Models Included**:
    - Gradient Boosting Classifier (96.88% accuracy)
    - Random Forest Classifier (96.88% accuracy)
    - Temporal Convolutional Network (experimental)

-   **Data Sources**:
    - Sentinel-1 SAR imagery
    - CHIRPS rainfall data
    - MODIS temperature and NDVI
    - ERA5 climate reanalysis
    - Historical flood records (2014-2024)

---

## Project Structure

```
SSDFLOODSENSEFLOODPREDICTION/
├── frontend/             # React application
│   ├── src/              # Application source code
│   ├── public/           # Static assets
│   └── nginx.conf        # Production web server config
├── ee-fastapi/           # SAR detection microservice
│   ├── src/              # GEE processing logic
│   └── static/           # Map visualization assets
├── data/                 # Training datasets (CSV)
├── models/               # Trained ML models
├── notebooks/            # Jupyter notebooks for exploration
├── docker-compose.yml    # Development orchestration
├── docker-compose.prod.yml  # Production orchestration
└── README.md             # This file
```

**Note**: Backend source code and configuration files are not included in the public repository for security reasons.

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1.  **Fork the repository**
2.  **Create a feature branch** (`git checkout -b feature/new-feature`)
3.  **Commit your changes** (`git commit -m 'Add new feature'`)
4.  **Push to the branch** (`git push origin feature/new-feature`)
5.  **Open a Pull Request**

### Development Guidelines

- Add tests for new features
- Follow existing code style
- Update documentation as needed
- Test locally with Docker before submitting PR
- Keep commits focused and atomic

---

## Security

This system handles sensitive flood prediction data. Please follow these security practices:

- **Never commit** `.env` files or credentials to the repository
- **Use strong passwords** for production deployments
- **Enable HTTPS** for production environments
- **Restrict access** to production services
- **Regular updates** of dependencies and Docker images

For security issues, please email: johnakec12@gmail.com

---

## License

This project is part of academic research at African Leadership University. All rights reserved.

---

## Contact

**Developer**: John Akech  
**Email**: johnakec12@gmail.com  
**Repository**: [github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION](https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION)  
**Institution**: African Leadership University

---

## Acknowledgments

- **Google Earth Engine** for providing free satellite imagery access
- **ALU Faculty** for guidance and support
- **South Sudan communities** for validation and feedback
- **Open-source community** for the excellent tools and libraries used in this project

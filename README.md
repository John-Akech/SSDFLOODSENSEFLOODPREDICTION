# FloodSense: Real-Time Flood Prediction & Early Warning System for South Sudan

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Academic-orange.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-38%2F38%20Passing-brightgreen.svg)](evidence/)

> **A Machine Learning-Based Flood Forecasting System leveraging Satellite Imagery, Real-Time Environmental Data, and Automated Alert Mechanisms to Protect Vulnerable Communities in South Sudan**

**Academic Capstone Project** | African Leadership University | Software Engineering | 2025

**Demo Video:** [FloodSense System Walkthrough](https://drive.google.com/file/d/1FcEZCI2VdIqJ7eEiZ0mTDhA_bbN8-Rgp/view?usp=sharing)

---

## 📖 Overview

FloodSense is a comprehensive flood prediction and early warning system designed to address the critical challenge of flood disasters in South Sudan. By integrating satellite remote sensing (Sentinel-1, CHIRPS, MODIS), machine learning algorithms, and real-time alert mechanisms, it provides accurate flood predictions and timely warnings to at-risk communities.

### Key Achievements
| Metric | Result | Status |
|--------|--------|--------|
| **Model Accuracy** | **96.88%** | Exceeded Target |
| **Precision** | **100%** | Perfect |
| **Recall** | **95.65%** | High Sensitivity |
| **Prediction Latency** | **< 500ms** | Real-time |
| **Historical Data** | **10 Years** | 2014-2024 |

---

## 🏗️ System Architecture

**[View High-Resolution Architecture Diagram](https://drive.google.com/file/d/1UZ5XmmUprbz7Nw3_yiG9reD3pUTrztH4/view?usp=sharing)**

FloodSense implements a modern microservices architecture:

*   **Frontend:** React 18, TypeScript, Tailwind CSS, Mapbox GL JS.
*   **Backend:** FastAPI (Python), SQLAlchemy, Pydantic.
*   **Data & ML:** Google Earth Engine, Scikit-learn, PyTorch, PostgreSQL/PostGIS.
*   **Infrastructure:** Docker Compose, Nginx, DigitalOcean.

---

## 🚀 Getting Started

### Prerequisites
*   **Docker Desktop** 24+
*   **Git**

### Quick Start (Docker)

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/John-Akech/SSDFLOODSENSEFLOODPREDICTION.git
    cd SSDFLOODSENSEFLOODPREDICTION
    ```

2.  **Configure Environment**
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    # Update .env files with your credentials if needed
    ```

3.  **Build and Run**
    ```bash
    docker-compose up -d --build
    ```

4.  **Access the Application**
    *   **Frontend:** `http://localhost:3000`
    *   **API Docs:** `http://localhost:8000/docs`
    *   **Health Check:** `http://localhost:8000/api/v1/health`

---

## 🧠 Machine Learning Pipeline

The system uses an automated pipeline to process satellite data and train models:

1.  **Data Extraction:** Fetches Sentinel-1 (SAR), CHIRPS (Rainfall), and MODIS (Vegetation/Temp) data via Google Earth Engine.
2.  **Preprocessing:** Generates 72 engineered features including rolling averages, spatial statistics, and lag features.
3.  **Training:** Trains Random Forest, Gradient Boosting, and TCN models.
4.  **Evaluation:** Compares models based on Accuracy, F1-Score, and AUC-ROC.

**Top Performing Model:** Random Forest Classifier (96.88% Accuracy).

To run the pipeline manually:
```bash
cd backend
python ml_pipeline/run_pipeline.py
```

---

## 📂 Project Structure

```
SSDFLOODSENSEFLOODPREDICTION/
├── backend/           # FastAPI application & ML Pipeline
│   ├── app/           # API routes, models, services
│   └── ml_pipeline/   # Data processing & training scripts
├── frontend/          # React application
│   ├── src/           # Components, hooks, pages
│   └── public/        # Static assets
├── ee-fastapi/        # Google Earth Engine Microservice
├── data/              # Datasets (Git LFS)
├── models/            # Trained model artifacts (.pkl, .pt)
├── notebooks/         # Jupyter notebooks for analysis
├── scripts/           # Deployment & utility scripts
└── docker-compose.yml # Container orchestration
```

---

## 🧪 Testing & Validation

*   **Unit/Integration Tests:** `pytest` (100% pass rate).
*   **Frontend Tests:** `npm test` (Vitest/Jest).
*   **Load Testing:** `locust` (Supports 100+ concurrent users).

Run backend tests:
```bash
docker-compose exec backend pytest
```

---

## 🤝 Contributing

Contributions are welcome!
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License & Contact

**License:** Academic / MIT. See [LICENSE](LICENSE) for details.

**Project Maintainer:**
*   **John Akech** - [GitHub](https://github.com/John-Akech) | [LinkedIn](https://linkedin.com/in/john-akech)
*   **Email:** johnakec12@gmail.com

**Citation:**
```bibtex
@software{akech2025floodsense,
  title={FloodSense: Real-Time Flood Prediction and Early Warning System for South Sudan},
  author={Akech, John},
  year={2025},
  institution={African Leadership University}
}
```

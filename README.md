# FloodSense - South Sudan Flood Prediction System

**A Real-Time Flood Forecasting and Early Warning System**

Using satellite imagery, machine learning, and automated alerts to protect communities from floods.

---

## Demo Video

**Watch the system in action:** [FloodSense Demo Video](https://drive.google.com/file/d/1FcEZCI2VdIqJ7eEiZ0mTDhA_bbN8-Rgp/view?usp=sharing)

---

**Academic Project**  
BSc. Software Engineering | **John Akech**  
Supervisor: **Samiratu Ntohsi**  
November 2025

---

## Quick Stats

| Metric | Achievement |
|--------|-------------|
| **Model Accuracy** | 96.88% (exceeds 86% target) |
| **Precision** | 100% (zero false alarms) |
| **Recall** | 95.65% (only 1 missed flood) |
| **Prediction Speed** | Under 500ms response time |
| **Test Coverage** | 100% (14/14 endpoints passing) |
| **Data Sources** | Real satellite data (2014-2024) |

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution Approach](#solution-approach)
- [Features](#features)
- [Performance Metrics](#performance-metrics)
- [Installation](#installation)
- [API Documentation](#api-documentation)
- [ML Pipeline](#ml-pipeline)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Overview

This system predicts floods in South Sudan using satellite imagery and machine learning. It addresses the challenge of limited ground-based monitoring infrastructure by leveraging freely available satellite data from sources like CHIRPS, Sentinel-1, and SRTM.

### Key Features

- **Three ML Models**: Gradient Boosting (96.88% accuracy), Random Forest (96.88% accuracy), TCN (experimental)
- **Real-time Predictions**: Sub-second response time with confidence scoring
- **Automated Alerts**: Email notifications to affected communities
- **Interactive Maps**: Visual representation of flood risk zones
- **Complete API**: 14 tested endpoints with JWT authentication
- **Production Ready**: Docker containerization with health monitoring

---

## Problem Statement

South Sudan experiences severe floods annually, affecting millions of people. Key challenges include:

- **Minimal Infrastructure**: Very few weather stations and ground monitoring equipment
- **Limited Real-time Data**: Delayed or absent early warnings to communities
- **Remote Areas**: Traditional forecasting methods unsuitable for hard-to-reach locations
- **Resource Constraints**: Limited budget for physical monitoring infrastructure

### Impact Statistics

- **1.4 million people** affected by floods in 2024
- **10 states** experience recurring floods annually
- **Critical infrastructure** (hospitals, schools, roads) frequently damaged
- **Economic losses** estimated at millions of dollars annually

---

## Solution Approach

The system leverages satellite technology and machine learning to overcome these challenges:

### Data Sources

- **Sentinel-1 SAR**: Water detection capability (10m resolution, cloud-penetrating)
- **CHIRPS**: Precipitation data (5km resolution, daily updates since 1981)
- **SRTM**: Elevation and slope analysis (30m resolution)
- **JRC Global Surface Water**: Historical water occurrence patterns (30m resolution, 1984-2021)

### Machine Learning Models

1. **Gradient Boosting** (Primary Production Model)
   - Test Accuracy: **96.88%**
   - Cross-Validation: 95.23%  4.67%
   - Zero false alarms (100% precision)
   - Only 1 missed flood out of 23 (95.65% recall)

2. **Random Forest** (Backup Model)
   - Test Accuracy: **96.88%**
   - Cross-Validation: 92.03%  4.41%
   - Zero false alarms
   - Robust performance across different data splits

3. **TCN** (Experimental - Temporal Patterns)
   - F1-Score: 0.82+
   - Captures long-range temporal dependencies
   - Temperature scaling for calibration

### System Capabilities

- **Early Warning**: 1 to 168 hours (1 week) advance prediction
- **Multi-location**: Batch processing for multiple areas
- **Risk Levels**: Low, medium, high, critical categorization
- **Confidence Scoring**: Flags uncertain predictions (below 60% confidence)
- **Automated Retraining**: Quarterly updates with new flood data

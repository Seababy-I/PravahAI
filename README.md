# PravahAI – Intelligent Traffic Forecasting and Decision Support System

PravahAI is a full-stack intelligent traffic analytics platform developed for **Flipkart GRiDLOCK 2.0**. The system transforms historical traffic incident data into actionable intelligence by identifying recurring traffic patterns, forecasting future congestion risks, detecting geographical hotspots, and providing AI-assisted operational recommendations for traffic management authorities. The project combines machine learning, spatial analytics, predictive modeling, and modern web technologies to support proactive traffic planning rather than reactive incident management. :contentReference[oaicite:0]{index=0}

---

## Live Application

**Demo:** *https://pravah-ai-alpha.vercel.app/dashboard*

---

## Problem Statement

Traffic control systems typically respond after congestion has already occurred. Many incidents classified as "unplanned" actually follow recurring spatial and temporal patterns that remain undiscovered.

PravahAI identifies these hidden recurring patterns ("Shadow Events") and forecasts future congestion risk to assist traffic authorities in proactive planning and resource allocation. :contentReference[oaicite:1]{index=1}

---

# Key Features

## Shadow Event Detection

- Detects recurring traffic incidents from historical records
- Groups incidents by corridor, weekday, and time bucket
- Identifies hidden recurring congestion patterns

---

## SERI (Shadow Event Risk Index)

Introduces a custom composite risk score based on

- Recurrence
- Frequency
- Severity

to rank recurring traffic events according to operational impact. :contentReference[oaicite:2]{index=2}

---

## Traffic Forecast Engine

- Predicts future congestion risk
- Uses historical recurrence patterns
- Temporal validation using hold-out evaluation
- Mean Absolute Error: **0.1375** :contentReference[oaicite:3]{index=3}

---

## Hotspot Detection

- Density-based hotspot detection using DBSCAN
- Geographic clustering of traffic incidents
- Interactive heatmap visualization

---

## Similarity Explorer

- Finds similar historical traffic incidents
- Ball Tree nearest-neighbor search
- 42-dimensional feature representation
- Time-aware similarity encoding

---

## What-If Simulator

Allows traffic authorities to simulate hypothetical public events and estimate congestion risk using historical incident patterns. :contentReference[oaicite:4]{index=4}

---

## AI Advisory System

- Powered by Gemini 2.0 Flash
- Converts analytical outputs into operational recommendations
- Generates explainable advisory reports
- Human-in-the-loop recommendation workflow :contentReference[oaicite:5]{index=5}

---

## Learning Engine

- Collects operator feedback
- Tracks forecast performance
- Stores prediction accuracy
- Enables future model calibration

---

# Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Leaflet
- CARTO Dark Tiles
- Leaflet Heat Layer
- Recharts

---

## Backend

- FastAPI
- Python

---

## Machine Learning & Analytics

- DBSCAN
- Ball Tree Nearest Neighbors
- Feature Engineering
- Time Series Analysis
- Spatial Analytics
- Forecast Modeling
- Similarity Search

---

## Artificial Intelligence

- Gemini 2.0 Flash
- Prompt Engineering
- AI Advisory Layer

---

## Database

- SQLite

---

# System Architecture

```
Historical Traffic Data
            │
            ▼
Data Cleaning & Feature Engineering
            │
            ▼
Shadow Event Detection
            │
            ▼
SERI Risk Scoring
            │
            ▼
Forecast Engine
            │
 ┌──────────┼──────────┐
 ▼          ▼          ▼
Hotspots  Similarity  What-If
Detection Explorer   Simulator
            │
            ▼
AI Advisory Layer
            │
            ▼
Interactive Dashboard
```

---

# Machine Learning Pipeline

1. Data Cleaning
2. Feature Engineering
3. Shadow Event Detection
4. SERI Risk Score Computation
5. DBSCAN Hotspot Clustering
6. Forecast Generation
7. AI Advisory Generation
8. Dashboard Visualization :contentReference[oaicite:6]{index=6}

---

# Project Structure

```
frontend/
backend/
data/
models/
analytics/
documentation/
```

---

# Installation

## Clone Repository

```bash
git clone <repository-url>

cd PravahAI
```

---

## Backend

```bash
cd backend

pip install -r requirements.txt

uvicorn app:app --reload
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# Research Highlights

- Analysed **8,139** historical traffic incidents
- Identified **666** recurring shadow events
- Detected **14** traffic hotspot clusters
- Designed the **SERI (Shadow Event Risk Index)** scoring methodology
- Developed an explainable AI advisory system
- Implemented predictive traffic forecasting with temporal validation :contentReference[oaicite:7]{index=7} :contentReference[oaicite:8]{index=8}

---

# Applications

- Traffic Control Centers
- Smart City Infrastructure
- Urban Planning
- Event Traffic Management
- Public Safety
- Disaster Response Planning

---

# Future Improvements

- Real-time traffic streaming
- PostgreSQL support
- Live IoT sensor integration
- Reinforcement Learning for adaptive forecasting
- Mobile application
- Multi-city deployment

---

# Contributors

**Priyali Jain**


**Shaunak Mohagaonkar**


---

# License

This project was developed as part of **Flipkart GRiDLOCK 2.0 Hackathon** for educational and research purposes.

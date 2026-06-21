# ShadowEvent AI — Implementation Walkthrough

## What Was Built

A full-stack traffic intelligence platform for Bengaluru, built end-to-end from the ASTRAM historical incident dataset.

---

## Live Application

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | http://localhost:5173 | ✅ Running |
| **Backend API** | http://localhost:8000 | ✅ Running |
| **API Docs** | http://localhost:8000/docs | ✅ Auto-generated |

---

## Demo Recording

![ShadowEvent AI Full Demo](file:///C:/Users/priyali/.gemini/antigravity-ide/brain/15deec8d-cb83-4787-b00e-c1e015f7a5f9/shadowevent_ai_demo_1781875831724.webp)

---

## Page Screenshots

````carousel
![Dashboard — 8,139 incidents, 699 shadow events, KPI cards, charts](file:///C:/Users/priyali/.gemini/antigravity-ide/brain/15deec8d-cb83-4787-b00e-c1e015f7a5f9/dashboard_overview_1781875865832.png)
<!-- slide -->
![Risk Calendar — 7×6 interactive weekly matrix](file:///C:/Users/priyali/.gemini/antigravity-ide/brain/15deec8d-cb83-4787-b00e-c1e015f7a5f9/risk_calendar_1781875896175.png)
<!-- slide -->
![Impact Map — Leaflet dark map with markers and hotspot circles](file:///C:/Users/priyali/.gemini/antigravity-ide/brain/15deec8d-cb83-4787-b00e-c1e015f7a5f9/impact_map_1781875912655.png)
<!-- slide -->
![Shadow Events — 699 patterns discovered, bar chart + table](file:///C:/Users/priyali/.gemini/antigravity-ide/brain/15deec8d-cb83-4787-b00e-c1e015f7a5f9/shadow_events_page_1781875929674.png)
<!-- slide -->
![Similarity Explorer — KNN results after selecting an incident](file:///C:/Users/priyali/.gemini/antigravity-ide/brain/15deec8d-cb83-4787-b00e-c1e015f7a5f9/similarity_results_1781875973645.png)
<!-- slide -->
![Knowledge Repository — 8,139 searchable records with 7 filters](file:///C:/Users/priyali/.gemini/antigravity-ide/brain/15deec8d-cb83-4787-b00e-c1e015f7a5f9/knowledge_repository_1781875998110.png)
````

---

## Data Pipeline Results

| Stage | Output |
|-------|--------|
| Raw CSV | 8,173 rows, 46 columns |
| After cleaning | 8,139 rows, 20 columns |
| After feature engineering | 8,139 rows, 34 columns |
| Shadow Events | **699 patterns** (4 High, 20 Medium, 675 Low) |
| Hotspots | **22 corridors** + 14 spatial clusters (DBSCAN) |
| KNN Index | 8,139 × 6 feature matrix, BallTree |

---

## API Endpoints (All Verified ✅)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health + data load status |
| GET | `/stats` | Dashboard KPIs |
| GET | `/shadow-events` | 699 shadow events, filterable |
| GET | `/risk-calendar` | 7×6 weekly risk matrix |
| GET | `/hotspots` | Top 22 corridors ranked |
| GET | `/map-data` | Heatmap + markers + hotspot pins |
| GET | `/search` | Full-text + 7-filter incident search |
| GET | `/similar-events/{id}` | KNN top-10 similar incidents |
| GET | `/corridors` | Dropdown options |
| GET | `/causes` | Dropdown options |
| GET | `/zones` | Dropdown options |

---

## Files Created

```
ShadowEvent-AI/
├── backend/
│   ├── main.py                    ← FastAPI app (10 endpoints, CORS, in-memory cache)
│   ├── bootstrap.py               ← One-shot pipeline runner
│   ├── data/
│   │   ├── pipeline.py            ← P0-002: cleaning
│   │   └── features.py            ← P0-003: feature engineering
│   └── services/
│       ├── shadow_events.py       ← P0-004: pattern discovery
│       ├── hotspots.py            ← P0-005: DBSCAN clustering
│       ├── risk_calendar.py       ← P0-006: weekly calendar
│       └── similarity.py         ← P1-001: KNN engine
│   └── database/
│       └── db.py                  ← P0-007: SQLite schema + bulk insert
│
├── frontend/src/
│   ├── App.tsx                    ← Router + sidebar
│   ├── index.css                  ← Complete dark design system
│   ├── api/
│   │   ├── client.ts
│   │   └── endpoints.ts
│   └── pages/
│       ├── Dashboard.tsx          ← P0-011: KPIs + charts + hotspot table
│       ├── MapView.tsx            ← P0-012: Leaflet interactive map
│       ├── RiskCalendar.tsx       ← P0-013: 7×6 risk matrix
│       ├── ShadowEvents.tsx       ← P1-005: explorer + chart
│       ├── SimilarityExplorer.tsx ← P1-003: KNN results UI
│       └── Repository.tsx         ← P1-004: searchable incident DB
│
└── data/
    ├── raw/astram_events.csv
    ├── processed/
    │   ├── incidents_clean.csv
    │   ├── incidents_features.csv
    │   ├── shadow_events.csv
    │   ├── hotspots.csv
    │   ├── risk_calendar.json
    │   ├── knn_index.pkl
    │   └── knn_scaler.pkl
    └── shadow_events.db           ← SQLite (3 tables, indexed)
```

---

## Tasks Completed

- **All 13 P0 tasks** ✅
- **All 7 P1 tasks** ✅
- **0 P2 tasks** (future work)

---

## How to Restart

```powershell
# Terminal 1 — Backend
cd "d:\HACKATHON\Flipkart\Prototype - Theme 2\ShadowEvent-AI\backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
cd "d:\HACKATHON\Flipkart\Prototype - Theme 2\ShadowEvent-AI\frontend"
npm run dev
```

> If data needs rebuilding from scratch: `python bootstrap.py` in the backend folder.

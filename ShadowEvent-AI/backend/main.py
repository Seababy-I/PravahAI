"""
ShadowEvent AI — Phase 2 FastAPI Application
All routes: Phase 1 (backward-compat) + Phase 2 (SERI, forecast, what-if, learning, MMI)
"""

import numpy as np
import math
import pickle
import sys
import os
import json
import pandas as pd
from typing import Optional, List
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Query, HTTPException, Body

# Load .env file (MMI_REST_KEY and other secrets)
try:
    from dotenv import load_dotenv as _load_dotenv
    import pathlib as _pl
    _env = _pl.Path(__file__).parent / ".env"
    if _env.exists():
        _load_dotenv(_env)
except ImportError:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
PROC_DIR = os.path.join(DATA_DIR, "processed")
DB_PATH = os.path.join(DATA_DIR, "shadow_events.db")

sys.path.insert(0, BASE_DIR)

from utils.ist_utils import utc_str_to_ist, now_ist

# IST timestamp utility

app = FastAPI(
    title="ShadowEvent AI",
    description="Phase 2 — Proactive Traffic Intelligence Platform for Bengaluru",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ─── In-memory caches ────────────────────────────────────────────────────────
_df_feat: pd.DataFrame = None
_df_shadow: pd.DataFrame = None
_df_hotspot: pd.DataFrame = None
_calendar: dict = None
_forecast: dict = None
_knn = None
_scaler = None
_knn_ids: list = None
_mmi_config: dict = None


def _load_data():
    global _df_feat, _df_shadow, _df_hotspot, _calendar, _forecast, _knn, _scaler, _knn_ids, _mmi_config

    for attr, path, loader in [
        ("_df_feat", os.path.join(
            PROC_DIR, "incidents_features.csv"), lambda p: pd.read_csv(
            p, low_memory=False)), ("_df_shadow", os.path.join(
            PROC_DIR, "shadow_events.csv"), lambda p: pd.read_csv(p)), ("_df_hotspot", os.path.join(
                PROC_DIR, "hotspots.csv"), lambda p: pd.read_csv(p)), ]:
        if os.path.exists(path):
            globals()[attr] = loader(path)
            print(f"[app] Loaded {attr}: {len(globals()[attr])} rows")

    cal_path = os.path.join(PROC_DIR, "risk_calendar.json")
    if os.path.exists(cal_path):
        with open(cal_path) as f:
            _calendar = json.load(f)

    fc_path = os.path.join(PROC_DIR, "forecast.json")
    if os.path.exists(fc_path):
        with open(fc_path) as f:
            _forecast = json.load(f)
        print(f"[app] Loaded forecast: {len(_forecast.get('forecast', []))}")

    for pkl, attr in [
        (os.path.join(PROC_DIR, "knn_index.pkl"), "_knn"),
        (os.path.join(PROC_DIR, "knn_scaler.pkl"), "_scaler"),
        (os.path.join(PROC_DIR, "knn_ids.pkl"), "_knn_ids"),
    ]:
        if os.path.exists(pkl):
            with open(pkl, "rb") as f:
                globals()[attr] = pickle.load(f)

    from services.mapmyindia import get_config
    _mmi_config = get_config()
    print(f"[app] MMI configured: {_mmi_config.get('valid', False)}")


@app.on_event("startup")
async def startup_event():
    _load_data()


def _records(df: pd.DataFrame) -> list:
    return json.loads(df.to_json(orient="records"))


def _add_ist(records: list) -> list:
    """
    Add start_datetime_ist field to every record that has start_datetime.
    Keeps the original UTC field for backward compatibility.
    """
    for r in records:
        if "start_datetime" in r and r["start_datetime"]:
            r["start_datetime_ist"] = utc_str_to_ist(str(r["start_datetime"]))
    return records


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1 ENDPOINTS (backward-compatible, updated with SERI data)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "data_loaded": _df_feat is not None,
        "shadow_events_loaded": _df_shadow is not None,
        "forecast_loaded": _forecast is not None,
        "knn_loaded": _knn is not None,
        "mmi_configured": _mmi_config.get(
            "valid",
            False) if _mmi_config else False,
    }


@app.get("/stats")
def get_dashboard_stats(named_only: bool = True):
    if _df_feat is None:
        raise HTTPException(503, "Data not loaded.")

    hour_col = "hour_ist" if "hour_ist" in _df_feat.columns else "hour"
    bucket_col = "time_bucket_ist" if "time_bucket_ist" in _df_feat.columns else "time_bucket"

    feat_df = _df_feat.copy()
    shadow_df = _df_shadow.copy() if _df_shadow is not None else None

    if named_only:
        feat_df = feat_df[feat_df["corridor"] != "Non-corridor"]
        if shadow_df is not None:
            shadow_df = shadow_df[shadow_df["corridor"] != "Non-corridor"]

    high_seri = int((shadow_df["seri"] >= 61).sum(
    )) if shadow_df is not None and "seri" in shadow_df.columns else 0
    critical_seri = int((shadow_df["seri"] >= 81).sum(
    )) if shadow_df is not None and "seri" in shadow_df.columns else 0
    top_seri = shadow_df.nlargest(1, "seri").iloc[0] if (
        shadow_df is not None and "seri" in shadow_df.columns and len(shadow_df)) else None

    return {
        "total_incidents": len(feat_df),
        "total_shadow_events": len(shadow_df) if shadow_df is not None else 0,
        "high_risk_events": high_seri,
        "critical_seri_slots": critical_seri,
        "active_corridors": int(feat_df["corridor"].nunique()),
        "named_corridors": int(feat_df[feat_df["is_named_corridor"] == 1]["corridor"].nunique()) if "is_named_corridor" in feat_df.columns else 0,
        "top_cause": feat_df["event_cause"].value_counts().index[0] if len(feat_df) else "",
        "top_corridor": feat_df[feat_df["corridor"] != "Non-corridor"]["corridor"].value_counts().index[0] if len(feat_df[feat_df["corridor"] != "Non-corridor"]) else "",
        "top_seri_corridor": top_seri["corridor"] if top_seri is not None else "",
        "top_seri_value": round(float(top_seri["seri"]), 1) if top_seri is not None else 0,
        "cause_distribution": feat_df["event_cause"].value_counts().head(12).to_dict(),
        "day_distribution": feat_df["day_name"].value_counts().to_dict(),
        "hour_distribution": {str(k): int(v) for k, v in feat_df[hour_col].value_counts().sort_index().to_dict().items()},
        "time_bucket_distribution": feat_df[bucket_col].value_counts().to_dict(),
        "total_weeks_in_data": 23,
        "dataset_span": "Nov 2023 – Apr 2024",
        "timestamp_note": "Hour distribution uses IST (+5:30). Peak at 2-3 AM IST reflects freight vehicle breakdowns.",
    }


@app.get("/shadow-events")
def get_shadow_events(
    corridor: Optional[str] = None,
    day: Optional[str] = None,
    risk_level: Optional[str] = None,
    seri_band: Optional[str] = None,
    time_bucket: Optional[str] = None,
    named_only: bool = False,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
):
    if _df_shadow is None:
        raise HTTPException(503, "Shadow events not loaded.")
    df = _df_shadow.copy()
    if named_only:
        df = df[df["corridor"] != "Non-corridor"]
    if corridor:
        df = df[df["corridor"].str.contains(corridor, case=False, na=False)]
    if day:
        df = df[df["day_name"].str.lower() == day.lower()]
    if risk_level:
        df = df[df["risk_level"].str.lower() == risk_level.lower()]
    if seri_band:
        df = df[df["seri_band"].str.lower() == seri_band.lower()]
    if time_bucket:
        df = df[df["time_bucket"] == time_bucket]
    total = len(df)
    return {"total": total, "offset": offset, "limit": limit,
            "data": _records(df.iloc[offset:offset + limit])}


@app.get("/risk-calendar")
def get_risk_calendar():
    if _calendar is None:
        raise HTTPException(503, "Risk calendar not loaded.")
    return _calendar


@app.get("/hotspots")
def get_hotspots(
        risk_level: Optional[str] = None,
        limit: int = 25,
        named_only: bool = True):
    if _df_hotspot is None:
        raise HTTPException(503, "Hotspots not loaded.")
    df = _df_hotspot.copy()
    if named_only:
        df = df[df["corridor"] != "Non-corridor"]
    if risk_level:
        df = df[df["risk_level"].str.lower() == risk_level.lower()]
    return {"total": len(df.head(limit)), "data": _records(df.head(limit))}


@app.get("/map-data")
def get_map_data(
    event_cause: Optional[str] = None,
    corridor: Optional[str] = None,
    layer: Optional[str] = None,     # incidents | hotspots | shadow | heatmap
    limit: int = Query(default=3000, le=8200),
):
    if _df_feat is None:
        raise HTTPException(503, "Data not loaded.")

    bucket_col = "time_bucket_ist" if "time_bucket_ist" in _df_feat.columns else "time_bucket"
    df = _df_feat[["id", "latitude", "longitude", "event_cause", "corridor",
                   "day_name", bucket_col, "risk_weight", "priority",
                   "status", "address", "start_datetime"]].copy()
    df = df.rename(columns={bucket_col: "time_bucket"})

    if event_cause:
        df = df[df["event_cause"].str.contains(
            event_cause, case=False, na=False)]
    if corridor:
        df = df[df["corridor"].str.contains(corridor, case=False, na=False)]

    # Heatmap: incidents with risk_weight as intensity
    heatmap = df[["latitude", "longitude", "risk_weight"]
                 ].dropna().values.tolist()

    # Shadow event heatmap (SERI-weighted centroids)
    shadow_heat = []
    if _df_shadow is not None and "seri" in _df_shadow.columns:
        sh = _df_shadow[["lat_centroid", "lon_centroid", "seri"]].dropna()
        shadow_heat = sh.values.tolist()

    markers = _add_ist(_records(df.head(limit)))
    hotspots = _records(_df_hotspot[_df_hotspot["corridor"] != "Non-corridor"][["hotspot_id",
                                                                                "corridor",
                                                                                "lat",
                                                                                "lon",
                                                                                "risk_level",
                                                                                "total_incidents",
                                                                                "hotspot_score"]].head(25)) if _df_hotspot is not None else []

    return {
        "heatmap": heatmap,
        "shadow_heatmap": shadow_heat,
        "markers": markers,
        "hotspots": hotspots,
        "total_points": len(heatmap),
    }


@app.get("/search")
def search_incidents(
    q: Optional[str] = None,
    event_cause: Optional[str] = None,
    corridor: Optional[str] = None,
    zone: Optional[str] = None,
    priority: Optional[str] = None,
    day_name: Optional[str] = None,
    time_bucket: Optional[str] = None,
    named_only: bool = False,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    if _df_feat is None:
        raise HTTPException(503, "Data not loaded.")
    df = _df_feat.copy()
    if named_only:
        df = df[df["is_named_corridor"] ==
                1] if "is_named_corridor" in df.columns else df[df["corridor"] != "Non-corridor"]
    if q:
        df = df[df["address"].str.contains(q, case=False, na=False) |
                df["corridor"].str.contains(q, case=False, na=False) |
                df["event_cause"].str.contains(q, case=False, na=False)]
    if event_cause and event_cause != "all":
        df = df[df["event_cause"] == event_cause]
    if corridor and corridor != "all":
        df = df[df["corridor"].str.contains(corridor, case=False, na=False)]
    if zone and zone != "all":
        df = df[df["zone"].str.contains(zone, case=False, na=False)]
    if priority and priority != "all":
        df = df[df["priority"] == priority]
    if day_name:
        df = df[df["day_name"].str.lower() == day_name.lower()]

    bucket_col = "time_bucket_ist" if "time_bucket_ist" in df.columns else "time_bucket"
    if time_bucket and time_bucket != "all":
        df = df[df[bucket_col] == time_bucket]

    total = len(df)
    cols = [
        "id",
        "event_type",
        "event_cause",
        "corridor",
        "zone",
        "address",
        "priority",
        "status",
        "veh_type",
        "day_name",
        "hour_ist",
        bucket_col,
        "month_name",
        "latitude",
        "longitude",
        "start_datetime",
        "risk_weight",
        "recurrence_score",
        "date"]
    available = [c for c in cols if c in df.columns]
    page = df[available].iloc[offset:offset + limit]
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "data": _add_ist(
            _records(page))}


@app.get("/similar-events/{incident_id}")
def get_similar_events(incident_id: str, top_k: int = 10):
    if _knn is None or _df_feat is None:
        raise HTTPException(503, "Similarity index not loaded.")
    from services.similarity import find_similar_events
    results = find_similar_events(
        incident_id,
        _df_feat,
        _knn,
        _scaler,
        _knn_ids,
        top_k)
    if not results:
        raise HTTPException(404, 
        f"Incident '{incident_id}' not found.")
    query_row = _df_feat[_df_feat["id"] == incident_id]
    query_info = {}
    if len(query_row):
        r = query_row.iloc[0]
        # use json loads of to_json to ensure native python types instead of np.int64
        import json
        r_dict = json.loads(r.to_json())
        keys_to_keep = [
            "id", "address", "corridor", "event_cause", "day_name",
            "hour", "hour_ist", "latitude", "longitude", "start_datetime"
        ]
        query_info = {k: r_dict.get(k, "") for k in keys_to_keep}
        query_info["start_datetime_ist"] = utc_str_to_ist(
            str(query_info.get("start_datetime", "")))
    return {
        "query_incident": query_info,
        "similar_events": _add_ist(results),
        "count": len(results)}


@app.get("/corridors")
def get_corridors(named_only: bool = False):
    if _df_feat is None:
        raise HTTPException(503, "Data not loaded.")
    df = _df_feat
    if named_only:
        df = df[df["corridor"] != "Non-corridor"]
    return {"corridors": sorted(df["corridor"].dropna().unique().tolist())}


@app.get("/causes")
def get_causes():
    if _df_feat is None:
        raise HTTPException(503, "Data not loaded.")
    return {
        "causes": sorted(
            _df_feat["event_cause"].dropna().unique().tolist())}


@app.get("/zones")
def get_zones():
    if _df_feat is None:
        raise HTTPException(503, "Data not loaded.")
    return {"zones": sorted(_df_feat["zone"].dropna().unique().tolist())}


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 2 ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/seri")
def get_seri(
    seri_band: Optional[str] = None,
    corridor: Optional[str] = None,
    named_only: bool = True,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
):
    """SERI scores for all shadow event slots."""
    if _df_shadow is None:
        raise HTTPException(503, "Shadow events not loaded.")
    if "seri" not in _df_shadow.columns:
        raise HTTPException(503, "SERI not computed. Re-run bootstrap.")

    df = _df_shadow.copy()
    if named_only:
        df = df[df["corridor"] != "Non-corridor"]
    if corridor:
        df = df[df["corridor"].str.contains(corridor, case=False, na=False)]
    if seri_band:
        df = df[df["seri_band"].str.lower() == seri_band.lower()]

    df = df.sort_values("seri", ascending=False)
    total = len(df)
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "data": _records(df.iloc[offset:offset + limit]),
        "formula": "SERI = 0.4×recurrence_score + 0.4×frequency_score + 0.2×severity_score (×100)",
        "scale": "0–100",
        "bands": {"Low": "0–30", "Medium": "31–60", "High": "61–80", "Critical": "81–100"},
    }


@app.get("/forecast")
def get_forecast(
    day: Optional[str] = None,
    time_bucket: Optional[str] = None,
    band: Optional[str] = None,
    named_only: bool = True,
    limit: int = 50,
):
    """Historical Pattern-Based Forecast for the upcoming week."""
    if _forecast is None:
        raise HTTPException(503, "Forecast not loaded.")

    data = _forecast.get("forecast", [])
    weekly = _forecast.get("weekly_view", {})
    meta = _forecast.get("metadata", {})

    if named_only:
        data = [r for r in data if r.get("corridor") != "Non-corridor"]
    if day:
        data = [
            r for r in data if r.get(
                "day_name",
                "").lower() == day.lower()]
    if time_bucket:
        data = [r for r in data if r.get("time_bucket") == time_bucket]
    if band:
        data = [
            r for r in data if r.get(
                "forecast_band",
                "").lower() == band.lower()]

    return {
        "label": "Historical Pattern-Based Forecast — NOT real-time prediction",
        "metadata": meta,
        "weekly_view": weekly,
        "total": len(data),
        "data": data[:limit],
    }


class WhatIfInput(BaseModel):
    event_name: str = "Unnamed Event"
    lat: float
    lon: float
    # public_event|procession|vip_movement|protest|construction|other
    event_type: str = "public_event"
    attendance: str = "medium"         # small|medium|large
    day_of_week: int = 6               # 0=Mon…6=Sun


@app.post("/what-if")
def run_what_if(body: WhatIfInput):
    """What-If Event Simulator — historical analog lookup."""
    from services.whatif import run_whatif
    feat_path = os.path.join(PROC_DIR, "incidents_features.csv")
    shadow_path = os.path.join(PROC_DIR, "shadow_events.csv")
    result = run_whatif(
        lat=body.lat, lon=body.lon,
        event_type=body.event_type,
        attendance=body.attendance,
        day_of_week=body.day_of_week,
        event_name=body.event_name,
        feat_path=feat_path,
        shadow_path=shadow_path,
    )
    return result


@app.get("/learning-history")
def get_learning_history(limit: int = 100):
    """Adaptive learning feedback history."""
    from database.db import get_learning_history as _glh, get_learning_accuracy
    history = _glh(limit=limit, db_path=DB_PATH)
    accuracy = get_learning_accuracy(db_path=DB_PATH)
    return {"history": history, "accuracy": accuracy, "total": len(history)}


class FeedbackInput(BaseModel):
    forecast_log_id: int
    user_rating: str   # "Accurate" | "Inaccurate" | "Partial"
    actual_score: float = 0.0
    notes: str = ""


@app.post("/feedback")
def submit_feedback(body: FeedbackInput):
    """Submit user feedback for a forecast entry."""
    from database.db import add_feedback
    result = add_feedback(
        forecast_log_id=body.forecast_log_id,
        user_rating=body.user_rating,
        actual_score=body.actual_score,
        notes=body.notes,
        db_path=DB_PATH,
    )
    if result is None:
        raise HTTPException(
            404, 
            f"forecast_log_id {body.forecast_log_id} not found")
    return {"success": True, **result}


@app.get("/mmi-config")
def get_mmi_config():
    """MapMyIndia integration configuration and status."""
    from services.mapmyindia import get_config
    return get_config()


@app.get("/heatmap-data")
def get_heatmap_data(layer: str = "incidents"):
    """
    Heatmap data for map layers.
    layer=incidents → [lat, lon, risk_weight]
    layer=shadow    → [lat, lon, seri/100] from shadow event centroids
    """
    if layer == "shadow":
        if _df_shadow is None:
            raise HTTPException(503, "Shadow events not loaded.")
        df = _df_shadow[["lat_centroid", "lon_centroid", "seri"]].dropna()
        # Normalize SERI to [0,1] for heatmap intensity
        df = df.copy()
        df["intensity"] = df["seri"] / 100.0
        return {"layer": "shadow", "points": df[[
            "lat_centroid", "lon_centroid", "intensity"]].values.tolist()}
    else:  # incidents
        if _df_feat is None:
            raise HTTPException(503, "Data not loaded.")
        df = _df_feat[["latitude", "longitude", "risk_weight"]].dropna()
        return {"layer": "incidents", "points": df.values.tolist()}


@app.get("/methodology")
def get_methodology():
    """System methodology documentation for the Methodology page."""
    return {
        "dataset": {
            "name": "ASTRAM Traffic Events Dataset",
            "rows": 8139,
            "columns_raw": 46,
            "columns_used": 20,
            "span": "Nov 2023 – Apr 2024",
            "weeks": 23,
            "city": "Bengaluru, India",
            "bounding_box": {"lat": [12.5, 13.2], "lon": [77.2, 77.8]},
        },
        "pipeline": [
            "Raw CSV (8,173 rows) → Data Cleaning → Feature Engineering → Shadow Event Discovery → SERI Computation → Forecast Engine → Similarity Index",
        ],
        "timestamp_note": "Timestamps are UTC. IST = UTC + 5:30. Peak incidents at 2-3 AM IST reflect freight vehicles (restricted from Bengaluru daytime entry).",
        "shadow_event": {
            "definition": "A (corridor, day_of_week, time_bucket_ist) combination that appears in at least 1 of 23 weeks.",
            "total": 666,
            "formula": "Aggregated by groupby(corridor, day_name, time_bucket_ist)",
        },
        "seri": {
            "name": "Shadow Event Risk Index",
            "formula": "SERI = (0.4 × recurrence_score + 0.4 × frequency_score + 0.2 × severity_score) × 100",
            "components": {
                "recurrence_score": "distinct_weeks_present / 23  ∈ [0,1]",
                "frequency_score": "incident_count / max_incident_count  ∈ [0,1]",
                "severity_score": "Σ cause_severity_weight / max_Σ  ∈ [0,1]",
            },
            "cause_severity_weights": {
                "accident": 3.0, "congestion": 2.0, "water_logging": 1.5,
                "construction": 1.5, "tree_fall": 1.2, "vehicle_breakdown": 1.0,
            },
            "scale": "0–100",
            "bands": {"Low": "0–30", "Medium": "31–60", "High": "61–80", "Critical": "81–100"},
        },
        "forecast": {
            "formula": "forecast_score = 0.7 × recurrence_score + 0.3 × recent_trend_score",
            "recent_trend": "incident count in last 4 weeks / max across all slots",
            "holdout": "Last 2 weeks of dataset used as pseudo-actuals for MAE validation",
            "label": "Historical Pattern-Based Forecast — NOT real-time prediction",
        },
        "similarity": {
            "algorithm": "KNN BallTree, Euclidean distance, k=10",
            "features": ["latitude", "longitude", "hour_ist", "day_of_week", "event_cause_id", "corridor_id"],
            "normalization": "StandardScaler (zero mean, unit variance)",
            "similarity_score": "1 / (1 + euclidean_distance)",
        },
        "hotspots": {
            "method_a": "Corridor rank by Σ risk_weight, normalized to [0,1]",
            "method_b": "DBSCAN: eps=0.008° (~889m at Bengaluru lat), min_samples=10",
            "clusters": 14,
        },
        "assumptions": [
            "Patterns from Nov 2023–Apr 2024 are representative of typical Bengaluru traffic.",
            "risk_weight multipliers (1.5× High, 2× accident) are domain heuristics, not empirically calibrated.",
            "SERI severity weights are domain heuristics.",
            "What-If attendance multipliers (1.0/1.3/1.7) are estimates, not empirically derived.",
            "Non-corridor label covers 38% of incidents — geographically dispersed, not a single hotspot.",
        ],
        "limitations": [
            "Cannot account for one-off events, weather, or policy changes.",
            "end_datetime is 94% null — no incident duration analysis possible.",
            "Zone data is 27% unknown after imputation.",
            "Forecast does not incorporate real-time feeds.",
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 7: AGENT INTELLIGENCE LAYER
# ═══════════════════════════════════════════════════════════════════════════════

class CorridorAdvisoryRequest(BaseModel):
    shadow_event_id: Optional[str] = None
    corridor: Optional[str] = None
    day_name: Optional[str] = None
    time_bucket: Optional[str] = None


class PlannedEventRequest(BaseModel):
    event_name: str
    event_date: str = ""
    corridor: str = ""
    zone: str = ""
    event_type: str = "public_event"
    attendance: str = "medium"
    lat: Optional[float] = None
    lon: Optional[float] = None


@app.post("/agent/corridor-advisory")
def get_corridor_advisory(req: CorridorAdvisoryRequest):
    """
    Generate an AI advisory for a specific shadow event corridor slot.
    Grounded in SERI, recurrence, and forecast data.
    """
    from services.agent import generate_corridor_alert

    if _df_shadow is None:
        raise HTTPException(503, "Shadow events not loaded.")

    df = _df_shadow.copy()

    # Find the shadow event
    if req.shadow_event_id:
        row = df[df["shadow_event_id"] == req.shadow_event_id]
    elif req.corridor and req.day_name and req.time_bucket:
        row = df[
            (df["corridor"] == req.corridor) &
            (df["day_name"] == req.day_name) &
            (df["time_bucket"] == req.time_bucket)
        ]
    else:
        raise HTTPException(400, "Provide shadow_event_id OR (corridor + day_name + time_bucket).")

    if len(row) == 0:
        raise HTTPException(404, "Shadow event not found.")

    se = row.iloc[0]

    # Look up forecast score for this slot
    forecast_score = 0.0
    forecast_band = "Low"
    if _forecast:
        for f in _forecast.get("forecast", []):
            if (f.get("corridor") == se.get("corridor") and
                    f.get("day_name") == se.get("day_name") and
                    f.get("time_bucket") == se.get("time_bucket")):
                forecast_score = float(f.get("forecast_score", 0))
                forecast_band = f.get("forecast_band", "Low")
                break

    advisory = generate_corridor_alert(
        corridor=str(se.get("corridor", "")),
        day_name=str(se.get("day_name", "")),
        time_bucket=str(se.get("time_bucket", "")),
        seri=float(se.get("seri", 0)),
        seri_band=str(se.get("seri_band", "Low")),
        recurrence_score=float(se.get("recurrence_score", 0)),
        incident_count=int(se.get("incident_count", 0)),
        top_cause=str(se.get("top_cause", "unknown")),
        forecast_score=forecast_score,
        forecast_band=forecast_band,
    )
    return advisory


@app.post("/agent/planned-event-advisory")
def get_planned_event_advisory(req: PlannedEventRequest):
    """
    Generate an AI advisory for a planned event.
    Finds nearby shadow events and grounds the advisory in SERI data.
    """
    from services.agent import generate_planned_event_advisory
    import math
    import datetime

    if _df_shadow is None:
        raise HTTPException(503, "Shadow events not loaded.")

    nearby_shadow = []
    if req.lat is not None and req.lon is not None:
        # Find shadow events within ~5 km using centroid coordinates
        df = _df_shadow.dropna(subset=["lat_centroid", "lon_centroid"]).copy()
        R = 6371  # Earth radius km

        def _dist(row):
            dlat = math.radians(row["lat_centroid"] - req.lat)
            dlon = math.radians(row["lon_centroid"] - req.lon)
            a = (math.sin(dlat / 2) ** 2 +
                 math.cos(math.radians(req.lat)) *
                 math.cos(math.radians(row["lat_centroid"])) *
                 math.sin(dlon / 2) ** 2)
            return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        df["dist_km"] = df.apply(_dist, axis=1)
        nearby = df[df["dist_km"] <= 5.0].sort_values("seri", ascending=False)
        nearby_shadow = _records(nearby.head(5))
    elif req.corridor:
        # Fall back to corridor match
        nearby = _df_shadow[
            _df_shadow["corridor"].str.contains(req.corridor, case=False, na=False)
        ].sort_values("seri", ascending=False)
        nearby_shadow = _records(nearby.head(5))

    # Fetch Forecast Context
    forecast_context = []
    if _forecast and req.corridor:
        for f in _forecast.get("forecast", []):
            if f.get("corridor", "").lower() == req.corridor.lower():
                forecast_context.append(f)

    # Fetch Hotspot Context
    hotspot_context = []
    if _df_hotspot is not None and req.corridor:
        hotspots = _df_hotspot[_df_hotspot["corridor"].str.contains(req.corridor, case=False, na=False)]
        if not hotspots.empty:
            hotspot_context = _records(hotspots)

    # Fetch Similar Incidents Context
    similar_incidents = []
    if _df_feat is not None and req.event_type:
        from services.whatif import find_cause_analogs
        day_of_week = None
        if req.event_date:
            try:
                dt = datetime.datetime.strptime(req.event_date, "%Y-%m-%d")
                day_of_week = dt.weekday()
            except ValueError:
                pass
        analogs = find_cause_analogs(_df_feat, req.event_type, day_of_week, limit=5)
        if req.corridor and not analogs.empty:
            corr_analogs = analogs[analogs["corridor"].str.contains(req.corridor, case=False, na=False)]
            if not corr_analogs.empty:
                analogs = corr_analogs
        # ensure we only serialize strings/numbers
        analogs = analogs[["corridor", "event_cause", "day_name", "time_bucket_ist", "address"]]
        similar_incidents = _records(analogs)

    advisory = generate_planned_event_advisory(
        event_name=req.event_name,
        event_date=req.event_date,
        corridor=req.corridor or "Unknown",
        zone=req.zone or "Unknown",
        event_type=req.event_type,
        attendance=req.attendance,
        nearby_shadow_events=nearby_shadow,
        forecast_context=forecast_context,
        hotspot_context=hotspot_context,
        similar_incidents=similar_incidents,
    )
    return advisory


@app.get("/agent/zone-brief/{zone}")
def get_zone_brief(zone: str):
    """
    Generate an AI zone-level intelligence brief.
    """
    from services.agent import generate_zone_brief

    if _df_shadow is None:
        raise HTTPException(503, "Shadow events not loaded.")

    zone_df = _df_shadow[
        _df_shadow["corridor"].str.contains(zone, case=False, na=False) |
        (_df_shadow.get("zone", pd.Series(dtype=str)) == zone
         if "zone" in _df_shadow.columns else False)
    ]

    shadow_events = _records(zone_df)
    return generate_zone_brief(zone=zone, shadow_events=shadow_events)


@app.get("/agent/status")
def get_agent_status():
    """Check Agent Intelligence Layer status."""
    has_key = bool(os.getenv("GEMINI_API_KEY"))
    try:
        import google.generativeai
        genai_installed = True
    except ImportError:
        genai_installed = False

    return {
        "agent_ready": has_key and genai_installed,
        "gemini_api_key_configured": has_key,
        "google_generativeai_installed": genai_installed,
        "fallback_available": True,
        "endpoints": [
            "POST /agent/corridor-advisory",
            "POST /agent/planned-event-advisory",
            "GET  /agent/zone-brief/{zone}",
        ],
        "disclaimer": "All recommendations are grounded in historical SERI, recurrence, and forecast data. NOT real-time."
    }

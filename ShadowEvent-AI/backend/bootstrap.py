"""
Phase 2 — Updated bootstrap.py
Runs full pipeline including forecast engine and MapMyIndia config.
"""

import os
import sys
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROC_DIR = os.path.join(DATA_DIR, "processed")

ASTRAM_CSV = os.path.join(
    BASE_DIR,
    "..",
    "..",
    "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")

RAW_DEST = os.path.join(RAW_DIR, "astram_events.csv")


def ensure_raw_data():
    os.makedirs(RAW_DIR, exist_ok=True)
    if not os.path.exists(RAW_DEST):
        if os.path.exists(ASTRAM_CSV):
            shutil.copy2(ASTRAM_CSV, RAW_DEST)
            print(f"[bootstrap] Copied ASTRAM CSV to {RAW_DEST}")
        else:
            print(f"[bootstrap] ERROR: Cannot find ASTRAM CSV at {ASTRAM_CSV}")
            sys.exit(1)
    else:
        print(f"[bootstrap] Raw data already at {RAW_DEST}")


def run():
    print("=" * 60)
    print("  ShadowEvent AI Phase 2 — Data Bootstrap")
    print("=" * 60)

    ensure_raw_data()
    sys.path.insert(0, BASE_DIR)

    # Step 1: Data Cleaning
    print("\n[Step 1] Data Cleaning Pipeline...")
    from data.pipeline import run_pipeline
    clean_path = os.path.join(PROC_DIR, "incidents_clean.csv")
    df_clean = run_pipeline(RAW_DEST, clean_path)

    # Step 2: Feature Engineering (with IST correction + recurrence_score)
    print("\n[Step 2] Feature Engineering (IST + SERI components)...")
    from data.features import run_feature_engineering
    feat_path = os.path.join(PROC_DIR, "incidents_features.csv")
    df_feat = run_feature_engineering(clean_path, feat_path)

    # Step 3: Shadow Event Discovery (SERI + recurrence)
    print("\n[Step 3] Shadow Event Discovery (SERI)...")
    from services.shadow_events import run_shadow_event_discovery
    shadow_path = os.path.join(PROC_DIR, "shadow_events.csv")
    df_shadow = run_shadow_event_discovery(feat_path, shadow_path)

    # Step 4: Hotspot Detection
    print("\n[Step 4] Hotspot Detection...")
    from services.hotspots import run_hotspot_detection
    hotspot_path = os.path.join(PROC_DIR, "hotspots.csv")
    df_hotspot, df_clusters = run_hotspot_detection(feat_path, hotspot_path)

    # Step 5: Risk Calendar (now uses IST time_bucket via shadow events)
    print("\n[Step 5] Risk Calendar Generation...")
    from services.risk_calendar import run_risk_calendar
    calendar_path = os.path.join(PROC_DIR, "risk_calendar.json")
    run_risk_calendar(shadow_path, calendar_path)

    # Step 6: Forecast Engine (new)
    print("\n[Step 6] Weekly Forecast Engine...")
    from services.forecast import run_forecast_engine
    forecast_path = os.path.join(PROC_DIR, "forecast.json")
    forecast_result = run_forecast_engine(
        feat_path, shadow_path, forecast_path)

    # Step 7: Database
    print("\n[Step 7] Database Setup & Population...")
    db_path = os.path.join(DATA_DIR, "shadow_events.db")
    from database.db import (create_tables, bulk_insert_incidents,
                             bulk_insert_shadow_events, bulk_insert_hotspots,
                             bulk_insert_forecast)
    create_tables(db_path)
    bulk_insert_incidents(df_feat, db_path)
    bulk_insert_shadow_events(df_shadow, db_path)
    bulk_insert_hotspots(df_hotspot, db_path)
    bulk_insert_forecast(forecast_result["forecast"], db_path)

    # Step 8: Similarity Engine
    print("\n[Step 8] Building Similarity Index...")
    from services.similarity import run_similarity_engine
    run_similarity_engine(feat_path)

    print("\n" + "=" * 60)
    print("  Bootstrap complete! Run: uvicorn main:app --reload")
    print("=" * 60)


if __name__ == "__main__":
    run()

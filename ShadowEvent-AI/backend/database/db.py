"""
Phase 2: Updated database schema — adds SERI, forecast_log, learning_feedback tables.
Backward-compatible with Phase 1 tables.
"""

import sqlite3
import pandas as pd
import json
import os
from contextlib import contextmanager

DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../data/shadow_events.db")


@contextmanager
def get_connection(db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def create_tables(db_path: str = DB_PATH):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    with get_connection(db_path) as conn:
        cur = conn.cursor()
        cur.executescript("""
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            event_type TEXT,
            event_cause TEXT,
            latitude REAL,
            longitude REAL,
            address TEXT,
            corridor TEXT,
            zone TEXT,
            status TEXT,
            priority TEXT,
            veh_type TEXT,
            requires_road_closure INTEGER,
            authenticated TEXT,
            police_station TEXT,
            junction TEXT,
            day_of_week INTEGER,
            day_name TEXT,
            hour INTEGER,
            hour_ist INTEGER,
            month INTEGER,
            month_name TEXT,
            time_bucket TEXT,
            time_bucket_ist TEXT,
            risk_weight REAL,
            recurrence_score REAL,
            cause_severity REAL,
            is_named_corridor INTEGER,
            start_datetime TEXT,
            date TEXT
        );

        CREATE TABLE IF NOT EXISTS shadow_events (
            shadow_event_id TEXT PRIMARY KEY,
            corridor TEXT,
            day_of_week INTEGER,
            day_name TEXT,
            time_bucket TEXT,
            incident_count INTEGER,
            weeks_present INTEGER,
            weighted_count REAL,
            recurrence_score REAL,
            frequency_score REAL,
            severity_score REAL,
            risk_score REAL,
            probability_score REAL,
            corridor_relative_score REAL,
            seri REAL,
            seri_band TEXT,
            risk_level TEXT,
            top_cause TEXT,
            lat_centroid REAL,
            lon_centroid REAL,
            accident_count INTEGER
        );

        CREATE TABLE IF NOT EXISTS hotspots (
            hotspot_id TEXT PRIMARY KEY,
            corridor TEXT,
            total_incidents INTEGER,
            weighted_score REAL,
            hotspot_score REAL,
            risk_level TEXT,
            lat REAL,
            lon REAL,
            top_cause TEXT,
            accident_count INTEGER,
            high_priority_count INTEGER
        );

        CREATE TABLE IF NOT EXISTS forecast_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            forecast_date TEXT,
            corridor TEXT,
            day_name TEXT,
            time_bucket TEXT,
            forecast_score REAL,
            recurrence_score REAL,
            recent_trend_score REAL,
            forecast_band TEXT,
            seri REAL,
            actual_score REAL,
            forecast_error REAL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS learning_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            forecast_log_id INTEGER,
            user_rating TEXT,
            actual_score REAL,
            error_pct REAL,
            notes TEXT,
            feedback_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(forecast_log_id) REFERENCES forecast_log(id)
        );

        CREATE TABLE IF NOT EXISTS planned_events (
            id TEXT PRIMARY KEY,
            event_name TEXT NOT NULL,
            event_date TEXT,
            corridor TEXT,
            zone TEXT,
            event_type TEXT,
            expected_attendance TEXT,
            lat REAL,
            lon REAL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS zone_playbooks (
            id TEXT PRIMARY KEY,
            zone TEXT NOT NULL,
            scenario TEXT NOT NULL,
            seri_threshold REAL,
            agent_recommendation TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_incidents_corridor ON incidents(corridor);
        CREATE INDEX IF NOT EXISTS idx_incidents_event_cause ON incidents(event_cause);
        CREATE INDEX IF NOT EXISTS idx_incidents_day_hour ON incidents(day_of_week, hour);
        CREATE INDEX IF NOT EXISTS idx_shadow_corridor ON shadow_events(corridor);
        CREATE INDEX IF NOT EXISTS idx_shadow_seri ON shadow_events(seri DESC);
        CREATE INDEX IF NOT EXISTS idx_shadow_risk ON shadow_events(risk_level);
        CREATE INDEX IF NOT EXISTS idx_forecast_corridor ON forecast_log(corridor, day_name);
        """)
        conn.commit()
    print(f"[db] Tables created/verified in {db_path}")


def bulk_insert_incidents(
        df: pd.DataFrame,
        db_path: str = DB_PATH,
        chunk_size: int = 500):
    cols = [
        "id", "event_type", "event_cause", "latitude", "longitude", "address",
        "corridor", "zone", "status", "priority", "veh_type",
        "requires_road_closure", "authenticated", "police_station", "junction",
        "day_of_week", "day_name", "hour", "hour_ist", "month", "month_name",
        "time_bucket", "time_bucket_ist", "risk_weight", "recurrence_score",
        "cause_severity", "is_named_corridor", "start_datetime", "date"
    ]
    available = [c for c in cols if c in df.columns]
    insert_df = df[available].copy()
    if "requires_road_closure" in insert_df.columns:
        insert_df["requires_road_closure"] = insert_df["requires_road_closure"].astype(
            int)

    with get_connection(db_path) as conn:
        conn.execute("DELETE FROM incidents")
        for i in range(0, len(insert_df), chunk_size):
            chunk = insert_df.iloc[i:i + chunk_size]
            chunk.to_sql("incidents", conn, if_exists="append", index=False)
        conn.commit()
    print(f"[db] Inserted {len(insert_df)} incidents")


def bulk_insert_shadow_events(df: pd.DataFrame, db_path: str = DB_PATH):
    cols = [
        "shadow_event_id",
        "corridor",
        "day_of_week",
        "day_name",
        "time_bucket",
        "incident_count",
        "weeks_present",
        "weighted_count",
        "recurrence_score",
        "frequency_score",
        "severity_score",
        "risk_score",
        "probability_score",
        "corridor_relative_score",
        "seri",
        "seri_band",
        "risk_level",
        "top_cause",
        "lat_centroid",
        "lon_centroid",
        "accident_count"]
    available = [c for c in cols if c in df.columns]
    with get_connection(db_path) as conn:
        conn.execute("DELETE FROM shadow_events")
        df[available].to_sql(
            "shadow_events",
            conn,
            if_exists="append",
            index=False)
        conn.commit()
    print(f"[db] Inserted {len(df)} shadow events")


def bulk_insert_hotspots(df: pd.DataFrame, db_path: str = DB_PATH):
    cols = [
        "hotspot_id", "corridor", "total_incidents", "weighted_score",
        "hotspot_score", "risk_level", "lat", "lon", "top_cause",
        "accident_count", "high_priority_count"
    ]
    available = [c for c in cols if c in df.columns]
    with get_connection(db_path) as conn:
        conn.execute("DELETE FROM hotspots")
        df[available].to_sql("hotspots", conn, if_exists="append", index=False)
        conn.commit()
    print(f"[db] Inserted {len(df)} hotspots")


def bulk_insert_forecast(forecast_records: list, db_path: str = DB_PATH):
    """Insert forecast records into forecast_log table."""
    from datetime import datetime
    with get_connection(db_path) as conn:
        conn.execute("DELETE FROM forecast_log")
        today = datetime.utcnow().isoformat()
        for r in forecast_records[:500]:  # cap at 500 rows
            conn.execute("""
                INSERT OR IGNORE INTO forecast_log
                (forecast_date, corridor, day_name, time_bucket,
                 forecast_score, recurrence_score, recent_trend_score,
                 forecast_band, seri, actual_score, forecast_error, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                today,
                r.get("corridor", ""),
                r.get("day_name", ""),
                r.get("time_bucket", ""),
                r.get("forecast_score", 0),
                r.get("recurrence_score", 0),
                r.get("recent_trend_score", 0),
                r.get("forecast_band", "Low"),
                r.get("seri", 0),
                r.get("actual_score"),
                r.get("forecast_error"),
                today,
            ))
        conn.commit()
    print(f"[db] Inserted {min(len(forecast_records), 500)} forecast records")


def add_feedback(forecast_log_id: int, user_rating: str, actual_score: float,
                 notes: str = "", db_path: str = DB_PATH):
    """Store user feedback on a forecast."""
    from datetime import datetime
    # Compute error %
    with get_connection(db_path) as conn:
        row = conn.execute(
            "SELECT forecast_score FROM forecast_log WHERE id=?",
            (forecast_log_id,
             )).fetchone()
        if row is None:
            return None
        forecast_score = row["forecast_score"]
        error_pct = abs(forecast_score - actual_score) / \
            max(forecast_score, 0.001) * 100
        conn.execute("""
            INSERT INTO learning_feedback
            (forecast_log_id, user_rating, actual_score, error_pct, notes, feedback_at)
            VALUES (?,?,?,?,?,?)
        """, (forecast_log_id, user_rating, actual_score,
              round(error_pct, 2), notes, datetime.utcnow().isoformat()))
        conn.commit()
    return {
        "forecast_log_id": forecast_log_id,
        "error_pct": round(
            error_pct,
            2)}


def get_learning_history(limit: int = 100, db_path: str = DB_PATH) -> list:
    with get_connection(db_path) as conn:
        rows = conn.execute("""
            SELECT lf.*, fl.corridor, fl.day_name, fl.time_bucket,
                   fl.forecast_score, fl.forecast_band
            FROM learning_feedback lf
            JOIN forecast_log fl ON lf.forecast_log_id = fl.id
            ORDER BY lf.feedback_at DESC LIMIT ?
        """, (limit,)).fetchall()
    return [dict(r) for r in rows]


def get_learning_accuracy(db_path: str = DB_PATH) -> dict:
    """Compute overall forecast accuracy metrics from user feedback."""
    with get_connection(db_path) as conn:
        rows = conn.execute("""
            SELECT user_rating, COUNT(*) as cnt, AVG(error_pct) as avg_err
            FROM learning_feedback GROUP BY user_rating
        """).fetchall()
        total = conn.execute(
            "SELECT COUNT(*) as cnt FROM learning_feedback").fetchone()
        held_out = conn.execute("""
            SELECT AVG(forecast_error) as mae, COUNT(*) as cnt
            FROM forecast_log WHERE forecast_error IS NOT NULL
        """).fetchone()
    breakdown = {
        r["user_rating"]: {
            "count": r["cnt"],
            "avg_error_pct": round(
                r["avg_err"] or 0,
                2)} for r in rows}
    return {
        "total_feedback": total["cnt"] if total else 0,
        "breakdown": breakdown,
        "held_out_mae": round(
            float(
                held_out["mae"] or 0),
            4) if held_out else 0,
        "held_out_slots": int(
            held_out["cnt"] or 0) if held_out else 0,
    }


def query_incidents(filters: dict = None, limit: int = 100, offset: int = 0,
                    db_path: str = DB_PATH):
    where_clauses, params = [], []
    if filters:
        for col, val in filters.items():
            if val is not None and val != "":
                where_clauses.append(f"{col} LIKE ?")
                params.append(f"%{val}%")
    where = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    sql = f"SELECT * FROM incidents {where} ORDER BY start_datetime DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    with get_connection(db_path) as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def count_incidents(filters: dict = None, db_path: str = DB_PATH) -> int:
    where_clauses, params = [], []
    if filters:
        for col, val in filters.items():
            if val is not None and val != "":
                where_clauses.append(f"{col} LIKE ?")
                params.append(f"%{val}%")
    where = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    sql = f"SELECT COUNT(*) as cnt FROM incidents {where}"
    with get_connection(db_path) as conn:
        row = conn.execute(sql, params).fetchone()
    return row["cnt"] if row else 0

"""
Phase 2: What-If Event Simulator

Finds historical analogs for a user-specified event scenario.
NOT a traffic simulation — purely historical incident lookup.

Input: location (lat, lon), event_type, expected_size, day_of_week
Output: similar historical incidents, estimated SERI for nearby corridors,
        likely affected corridors, risk zones.
"""

import pandas as pd
import numpy as np
import os
import math

IN_FEAT = os.path.join(os.path.dirname(__file__),
                       "../../data/processed/incidents_features.csv")
IN_SHADOW = os.path.join(
    os.path.dirname(__file__),
    "../../data/processed/shadow_events.csv")

# Attendance size → rough incident multiplier (heuristic, documented)
ATTENDANCE_MULTIPLIER = {
    "small": 1.0,   # < 1,000 attendees
    "medium": 1.3,   # 1,000–10,000
    "large": 1.7,   # > 10,000
}

SEARCH_RADIUS_KM = 2.0   # find incidents within 2 km of event location


def haversine_km(lat1, lon1, lat2_arr, lon2_arr) -> np.ndarray:
    """Vectorised haversine distance from a single point to an array of points."""
    R = 6371.0
    lat1, lon1 = math.radians(lat1), math.radians(lon1)
    lat2 = np.radians(lat2_arr.astype(float))
    lon2 = np.radians(lon2_arr.astype(float))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2)**2 + math.cos(lat1) * \
        np.cos(lat2) * np.sin(dlon / 2)**2
    return R * 2 * np.arcsin(np.sqrt(a))


def find_nearby_incidents(df: pd.DataFrame, lat: float, lon: float,
                          radius_km: float = SEARCH_RADIUS_KM) -> pd.DataFrame:
    """Return all incidents within radius_km of (lat, lon)."""
    valid = df.dropna(subset=["latitude", "longitude"])
    dists = haversine_km(
        lat,
        lon,
        valid["latitude"].values,
        valid["longitude"].values)
    nearby = valid.copy()
    nearby["distance_km"] = dists.round(3)
    return nearby[nearby["distance_km"] <=
                  radius_km].sort_values("distance_km")


def find_cause_analogs(df: pd.DataFrame, event_type: str, day_of_week: int,
                       limit: int = 20) -> pd.DataFrame:
    """Find historical incidents with same/related event type and same day."""
    # Map user event types to dataset causes
    type_map = {
        "public_event": ["public_event", "procession", "congestion"],
        "procession": ["procession", "public_event", "congestion"],
        "vip_movement": ["vip_movement", "procession"],
        "protest": ["protest", "public_event"],
        "construction": ["construction", "road_conditions"],
        "accident": ["accident"],
        "other": ["others"],
    }
    causes = type_map.get(event_type, [event_type, "others"])
    mask = df["event_cause"].isin(causes)
    if day_of_week is not None:
        mask &= (df["day_of_week"] == day_of_week)
    return df[mask].head(limit)


def estimate_affected_corridors(
        nearby_df: pd.DataFrame,
        shadow_df: pd.DataFrame,
        attendance: str) -> list:
    """
    For each named corridor in nearby incidents, look up its SERI
    and apply the attendance multiplier to produce an estimated impact score.
    Multiplier is documented as a heuristic — not empirically calibrated.
    """
    multiplier = ATTENDANCE_MULTIPLIER.get(attendance, 1.0)
    if nearby_df.empty:
        return []

    corridor_counts = (
        nearby_df[nearby_df["is_named_corridor"] == 1]
        .groupby("corridor")
        .agg(nearby_count=("id", "count"), avg_distance=("distance_km", "mean"))
        .reset_index()
        .sort_values("nearby_count", ascending=False)
        .head(8)
    )

    results = []
    for _, row in corridor_counts.iterrows():
        # Find SERI for this corridor (max across any day/bucket)
        shadow_match = shadow_df[shadow_df["corridor"] == row["corridor"]]
        base_seri = float(shadow_match["seri"].max()) if len(
            shadow_match) else 30.0
        estimated_seri = min(100, round(base_seri * multiplier, 1))

        def _band(s):
            if s >= 81:
                return "Critical"
            if s >= 61:
                return "High"
            if s >= 31:
                return "Medium"
            return "Low"

        results.append({
            "corridor": row["corridor"],
            "nearby_incidents": int(row["nearby_count"]),
            "avg_distance_km": round(row["avg_distance"], 2),
            "base_seri": round(base_seri, 1),
            "estimated_seri": estimated_seri,
            "estimated_band": _band(estimated_seri),
            "multiplier_used": multiplier,
            "multiplier_label": attendance,
        })
    return results


def run_whatif(lat: float, lon: float, event_type: str,
               attendance: str, day_of_week: int,
               event_name: str = "Unnamed Event",
               feat_path=IN_FEAT, shadow_path=IN_SHADOW) -> dict:
    """
    Main entry point for What-If simulation.

    Returns:
      - nearby_incidents: incidents within 2 km of event location
      - cause_analogs: historical incidents of same type on same day-of-week
      - affected_corridors: corridors with estimated SERI
      - methodology: documentation of how results were derived
    """
    df = pd.read_csv(feat_path, low_memory=False)
    shadow_df = pd.read_csv(shadow_path)

    # Add is_named_corridor if missing
    if "is_named_corridor" not in df.columns:
        df["is_named_corridor"] = (
            df["corridor"] != "Non-corridor").astype(int)

    nearby = find_nearby_incidents(df, lat, lon, SEARCH_RADIUS_KM)
    analogs = find_cause_analogs(df, event_type, day_of_week)
    affected = estimate_affected_corridors(nearby, shadow_df, attendance)

    # Summary stats from nearby incidents
    top_causes = nearby["event_cause"].value_counts().head(
        5).to_dict() if len(nearby) else {}
    top_buckets = nearby["time_bucket_ist"].value_counts().head(3).to_dict() if (
        "time_bucket_ist" in nearby.columns and len(nearby)) else {}

    return {
        "event_name": event_name,
        "input": {
            "lat": lat, "lon": lon, "event_type": event_type,
            "attendance": attendance, "day_of_week": day_of_week
        },
        "nearby_incidents": nearby[[
            "id", "corridor", "event_cause", "day_name", "time_bucket_ist",
            "distance_km", "priority", "start_datetime", "address"
        ]].replace({np.nan: None}).head(20).to_dict("records") if len(nearby) else [],
        "nearby_count": len(nearby),
        "cause_analogs": analogs[[
            "id", "corridor", "event_cause", "day_name", "time_bucket_ist",
            "priority", "start_datetime", "address"
        ]].replace({np.nan: None}).head(10).to_dict("records") if len(analogs) else [],
        "affected_corridors": affected,
        "top_nearby_causes": top_causes,
        "top_nearby_time_buckets": top_buckets,
        "methodology": {
            "nearby_radius_km": SEARCH_RADIUS_KM,
            "attendance_multiplier": ATTENDANCE_MULTIPLIER.get(attendance, 1.0),
            "multiplier_rationale": "Heuristic scaling factor: larger events have more spillover traffic. Not empirically calibrated.",
            "seri_source": "Historical SERI from shadow events; estimated_seri = base_seri × multiplier",
            "label": "Historical analog lookup — NOT traffic simulation",
            "limitation": "Does not model vehicles, signal timing, or diversion routes.",
        },
    }
if __name__ == "__main__":
    result = run_whatif(
        lat=12.9352,
        lon=77.6245,
        event_type="public_event",
        attendance="large",
        day_of_week=6,
        event_name="Test Public Event"
    )

    print(
        f"Nearby: {result['nearby_count']}, Corridors affected: {len(result['affected_corridors'])}"
    )

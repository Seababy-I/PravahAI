"""
Phase 2: Shadow Event Discovery (v2)
- Uses IST time_bucket_ist (audited)
- Adds recurrence_score (weeks_present / TOTAL_WEEKS)
- Renames probability_score → risk_score (keeps alias)
- Adds SERI components
"""

import pandas as pd
import numpy as np
import os

IN_PATH = os.path.join(os.path.dirname(__file__),
                       "../../data/processed/incidents_features.csv")
OUT_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../data/processed/shadow_events.csv")

TOTAL_WEEKS = 23
RISK_THRESHOLDS = {"high": 0.60, "medium": 0.30}

CAUSE_SEVERITY = {
    "accident": 3.0, "congestion": 2.0, "water_logging": 1.5,
    "construction": 1.5, "tree_fall": 1.2, "road_conditions": 1.1,
    "pot_holes": 1.0, "vehicle_breakdown": 1.0, "public_event": 1.0,
    "procession": 0.9, "others": 0.8, "debris": 0.8,
    "protest": 0.8, "vip_movement": 0.5,
}


def aggregate_by_location_time(df: pd.DataFrame) -> pd.DataFrame:
    """
    Group by corridor × day_of_week × time_bucket_ist (IST-corrected).
    Compute incident count, weighted count, severity, recurrence.
    """
    # Use IST time_bucket if available, fall back to UTC
    bucket_col = "time_bucket_ist" if "time_bucket_ist" in df.columns else "time_bucket"
    day_col = "day_name"

    # Compute distinct weeks per slot for recurrence
    week_col = "week_id" if "week_id" in df.columns else None

    # Add cause severity per row
    if "cause_severity" not in df.columns:
        df = df.copy()
        df["cause_severity"] = df["event_cause"].map(
            CAUSE_SEVERITY).fillna(0.8)

    agg = (
        df.groupby(["corridor", "day_of_week", day_col, bucket_col], as_index=False)
        .agg(
            incident_count=("id", "count"),
            weighted_count=("risk_weight", "sum"),
            severity_sum=("cause_severity", "sum"),
            top_cause=("event_cause", lambda x: x.value_counts().index[0]),
            lat_centroid=("latitude", "mean"),
            lon_centroid=("longitude", "mean"),
            weeks_present=("week_id", "nunique") if week_col else ("id", "count"),
            accident_count=("event_cause", lambda x: (x == "accident").sum()),
        )
    )

    # Standardize column names for downstream
    agg = agg.rename(columns={bucket_col: "time_bucket", day_col: "day_name"})
    return agg


def compute_scores(agg: pd.DataFrame) -> pd.DataFrame:
    """
    Compute three normalised component scores and SERI.

    recurrence_score  = weeks_present / TOTAL_WEEKS           ∈ [0,1]
    frequency_score   = incident_count / max(incident_count)  ∈ [0,1]
    severity_score    = severity_sum / max(severity_sum)       ∈ [0,1]

    risk_score (alias: probability_score) = weighted_count / max(weighted_count)

    SERI = (0.4×recurrence + 0.4×frequency + 0.2×severity) × 100   ∈ [0,100]
    """
    max_wt = agg["weighted_count"].max() or 1
    max_cnt = agg["incident_count"].max() or 1
    max_sev = agg["severity_sum"].max() or 1

    agg["recurrence_score"] = (
        agg["weeks_present"] /
        TOTAL_WEEKS).clip(
        0,
        1).round(4)
    agg["frequency_score"] = (agg["incident_count"] / max_cnt).round(4)
    agg["severity_score"] = (agg["severity_sum"] / max_sev).round(4)
    agg["risk_score"] = (agg["weighted_count"] / max_wt).round(4)
    agg["probability_score"] = agg["risk_score"]   # backward-compat alias

    # SERI ∈ [0, 100]
    agg["seri"] = (
        0.4 * agg["recurrence_score"] +
        0.4 * agg["frequency_score"] +
        0.2 * agg["severity_score"]
    ).clip(0, 1).mul(100).round(2)

    def _seri_band(s):
        if s >= 81:
            return "Critical"
        if s >= 61:
            return "High"
        if s >= 31:
            return "Medium"
        return "Low"

    agg["seri_band"] = agg["seri"].apply(_seri_band)
    agg["risk_level"] = agg["risk_score"].apply(
        lambda s: "High" if s >= RISK_THRESHOLDS["high"]
                  else ("Medium" if s >= RISK_THRESHOLDS["medium"] else "Low")
    )

    # Corridor-relative score
    corridor_max = agg.groupby("corridor")[
        "weighted_count"].transform("max").replace(0, 1)
    agg["corridor_relative_score"] = (
        agg["weighted_count"] /
        corridor_max).round(4)

    return agg


def generate_shadow_events(df: pd.DataFrame) -> pd.DataFrame:
    print(f"[shadow_events] Input: {len(df)} incidents")
    agg = aggregate_by_location_time(df)
    agg = compute_scores(agg)
    agg = agg.sort_values("seri", ascending=False).reset_index(drop=True)
    agg.insert(0, "shadow_event_id", [f"SE{i:04d}" for i in range(len(agg))])

    print(f"[shadow_events] Generated {len(agg)} shadow events")
    for band in ["Critical", "High", "Medium", "Low"]:
        print(f"  {band}: {(agg['seri_band'] == band).sum()}")
    return agg


def run_shadow_event_discovery(
        in_path=IN_PATH,
        out_path=OUT_PATH) -> pd.DataFrame:
    df = pd.read_csv(in_path, low_memory=False)
    shadow_df = generate_shadow_events(df)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    shadow_df.to_csv(out_path, index=False)
    print(f"[shadow_events] Saved to {out_path}")
    return shadow_df


if __name__ == "__main__":
    run_shadow_event_discovery()

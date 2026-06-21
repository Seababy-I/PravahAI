"""
P0-003 (v2): Feature Engineering — Phase 2 with IST correction, recurrence_score, non-corridor flag
"""

import pandas as pd
import numpy as np
import os

IN_PATH = os.path.join(os.path.dirname(__file__),
                       "../../data/processed/incidents_clean.csv")
OUT_PATH = os.path.join(os.path.dirname(__file__),
                        "../../data/processed/incidents_features.csv")

CORRIDOR_ZONE_MAP = {
    "Mysore Road": "West Zone 1", "Bellary Road 1": "North Zone 1",
    "Bellary Road 2": "North Zone 2", "Tumkur Road": "West Zone 1",
    "Hosur Road": "South Zone 1", "ORR North 1": "North Zone 1",
    "ORR North 2": "North Zone 2", "ORR East 1": "East Zone 1",
    "ORR East 2": "East Zone 2", "ORR West 1": "West Zone 1",
    "ORR West 2": "West Zone 2", "Old Madras Road": "East Zone 1",
    "Magadi Road": "West Zone 2", "Bannerghata Road": "South Zone 2",
    "West of Chord Road": "West Zone 1", "Outer Ring Road": "East Zone 1",
    "Airport Road": "East Zone 1", "Sarjapur Road": "East Zone 2",
    "Electronic City": "South Zone 2", "Whitefield Road": "East Zone 2",
}

# Cause severity for SERI
CAUSE_SEVERITY: dict = {
    "accident": 3.0, "congestion": 2.0, "water_logging": 1.5,
    "construction": 1.5, "tree_fall": 1.2, "road_conditions": 1.1,
    "pot_holes": 1.0, "vehicle_breakdown": 1.0, "public_event": 1.0,
    "procession": 0.9, "others": 0.8, "debris": 0.8,
    "protest": 0.8, "vip_movement": 0.5,
}

TOTAL_WEEKS = 23  # distinct weeks in the dataset (Nov 2023 – Apr 2024)


def extract_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract UTC and IST temporal features from start_datetime."""
    dt = pd.to_datetime(df["start_datetime"], utc=True, errors="coerce")

    # UTC features
    df["day_of_week"] = dt.dt.dayofweek          # 0=Mon…6=Sun
    df["day_name"] = dt.dt.day_name()
    df["hour"] = dt.dt.hour                # UTC hour
    df["minute"] = dt.dt.minute
    df["month"] = dt.dt.month
    df["month_name"] = dt.dt.month_name()
    df["date"] = dt.dt.date.astype(str)
    df["week_of_year"] = dt.dt.isocalendar().week.fillna(0).astype(int)
    df["year"] = dt.dt.year.fillna(0).astype(int)

    # Week ID for recurrence calculation
    df["week_id"] = df["week_of_year"].astype(
        str) + "_" + df["year"].astype(str)

    # ── IST Correction (UTC + 5:30) ─────────────────────────────────────────
    # Justification: ASTRAM timestamps use UTC offset (+00).
    # IST = UTC + 5 hours 30 minutes.
    # Bengaluru freight vehicles operate 11 PM–6 AM IST by municipal order,
    # explaining the IST peak at 2–3 AM IST.
    df["hour_ist"] = (
        df["hour"].fillna(0) *
        60 +
        df["minute"].fillna(0) +
        330).apply(
        lambda m: int(
            m //
            60) %
        24)

    def bucket(h: int) -> str:
        if pd.isna(h):
            return "unknown"
        h = int(h)
        if 5 <= h < 9:
            return "early_morning"
        elif 9 <= h < 13:
            return "morning"
        elif 13 <= h < 17:
            return "afternoon"
        elif 17 <= h < 21:
            return "evening"
        elif 21 <= h < 24:
            return "night"
        else:
            return "midnight"

    df["time_bucket"] = df["hour"].apply(bucket)      # UTC-based (legacy)
    df["time_bucket_ist"] = df["hour_ist"].apply(bucket)  # IST-based (correct)

    print(f"[features] Temporal features extracted (UTC + IST).")
    return df


def add_non_corridor_flag(df: pd.DataFrame) -> pd.DataFrame:
    """Flag Non-corridor events so they can be excluded from named-corridor analysis."""
    df["is_named_corridor"] = (df["corridor"] != "Non-corridor").astype(int)
    return df


def impute_zone_from_corridor(df: pd.DataFrame) -> pd.DataFrame:
    """Fill null zones using corridor → zone lookup."""
    mask = (df["zone"] == "Unknown") | (df["zone"].isna())
    df.loc[mask, "zone"] = df.loc[mask, "corridor"].map(
        CORRIDOR_ZONE_MAP).fillna("Unknown")
    remaining = (df["zone"] == "Unknown").sum()
    print(f"[features] Zone nulls after imputation: {remaining}")
    return df


def add_cause_severity(df: pd.DataFrame) -> pd.DataFrame:
    """Add cause_severity_weight for SERI severity component."""
    df["cause_severity"] = df["event_cause"].map(CAUSE_SEVERITY).fillna(0.8)
    return df


def encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    """Label-encode categoricals (kept for legacy KNN compatibility)."""
    for col in [
        "corridor",
        "event_cause",
        "zone",
        "veh_type",
            "time_bucket_ist"]:
        if col in df.columns:
            df[f"{col}_id"] = df[col].astype("category").cat.codes
    # Keep old time_bucket_id alias
    df["time_bucket_id"] = df["time_bucket_ist_id"] if "time_bucket_ist_id" in df.columns else 0
    print(f"[features] Categorical encoding complete.")
    return df


def compute_risk_weight(df: pd.DataFrame) -> pd.DataFrame:
    """
    risk_weight = base × priority_multiplier × cause_multiplier
    base=1.0, High priority=1.5x, accident=2x (stacks), vip=0.5x
    These are domain heuristics; the multipliers are tunable parameters.
    """
    df["risk_weight"] = 1.0
    df.loc[df["priority"] == "High", "risk_weight"] = 1.5
    df.loc[df["event_cause"] == "accident", "risk_weight"] *= 2.0
    df.loc[df["event_cause"] == "vip_movement", "risk_weight"] *= 0.5
    return df


def compute_slot_recurrence(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add per-row recurrence_score = distinct_weeks_present / TOTAL_WEEKS
    for the (corridor, day_name, time_bucket_ist) combination.
    This is a TRUE recurrence rate based on weekly presence.
    """
    weeks_per_slot = (
        df.groupby(["corridor", "day_name", "time_bucket_ist"])["week_id"]
        .nunique()
        .reset_index(name="weeks_present")
    )
    df = df.merge(
        weeks_per_slot, on=[
            "corridor", "day_name", "time_bucket_ist"], how="left")
    df["recurrence_score"] = (df["weeks_present"] / TOTAL_WEEKS).round(4)
    return df


def run_feature_engineering(
        in_path: str = IN_PATH,
        out_path: str = OUT_PATH) -> pd.DataFrame:
    print(f"[features] Loading cleaned data from {in_path}")
    df = pd.read_csv(in_path, low_memory=False)
    df = extract_temporal_features(df)
    df = add_non_corridor_flag(df)
    df = impute_zone_from_corridor(df)
    df = add_cause_severity(df)
    df = encode_categoricals(df)
    df = compute_risk_weight(df)
    df = compute_slot_recurrence(df)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    df.to_csv(out_path, index=False)
    print(
        f"[features] Saved {len(df)} rows, {len(df.columns)} cols -> {out_path}")
    return df


if __name__ == "__main__":
    run_feature_engineering()

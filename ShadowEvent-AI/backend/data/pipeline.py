"""
P0-002: Data Cleaning Pipeline
Loads raw ASTRAM CSV, cleans it, and outputs incidents_clean.csv
"""

import pandas as pd
import numpy as np
import os
import sys

RAW_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../data/raw/astram_events.csv")
OUT_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../data/processed/incidents_clean.csv")


def load_raw_data(path: str = RAW_PATH) -> pd.DataFrame:
    print(f"[pipeline] Loading raw data from {path}")
    df = pd.read_csv(path, encoding="utf-8", low_memory=False)
    print(f"[pipeline] Loaded {len(df)} rows, {len(df.columns)} columns")
    return df


def drop_useless_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Drop columns that are >95% null or carry no analytical value."""
    drop_cols = [
        "map_file", "comment", "meta_data", "direction",
        "resolved_at_address", "resolved_at_latitude", "resolved_at_longitude",
        "resolved_by_id", "resolved_datetime", "route_path",
        "cargo_material", "reason_breakdown", "age_of_truck",
        "endlatitude", "endlongitude",          # always 0 or null
        "end_address",                           # 91.6% null
        "assigned_to_police_id",                 # 98.4% null
        "citizen_accident_id",                   # 98.4% null
        "closed_by_id", "closed_datetime",       # 61.6% null
        "last_modified_by_id", "created_by_id",  # anonymised, no value
        "created_date", "modified_datetime",     # redundant
        "gba_identifier",                        # internal ID
        "kgid",                                  # internal ID
    ]
    existing = [c for c in drop_cols if c in df.columns]
    df = df.drop(columns=existing)
    print(
        f"[pipeline] Dropped {len(existing)} useless columns. Remaining: {len(df.columns)}")
    return df


def normalize_event_cause(df: pd.DataFrame) -> pd.DataFrame:
    """Lowercase and merge duplicate labels like 'Debris'/'debris'."""
    df["event_cause"] = df["event_cause"].str.strip().str.lower()
    # Merge aliases
    alias_map = {
        "test_demo": "others",
        "fog / low visibility": "road_conditions",
    }
    df["event_cause"] = df["event_cause"].replace(alias_map)
    return df


def parse_timestamps(df: pd.DataFrame) -> pd.DataFrame:
    """Parse start_datetime and end_datetime to UTC-aware datetimes."""
    df["start_datetime"] = pd.to_datetime(
        df["start_datetime"], utc=True, errors="coerce")
    if "end_datetime" in df.columns:
        df["end_datetime"] = pd.to_datetime(
            df["end_datetime"], utc=True, errors="coerce")
    print(
        f"[pipeline] Parsed timestamps. Null start_datetimes: {
            df['start_datetime'].isna().sum()}")
    return df


def validate_coordinates(df: pd.DataFrame) -> pd.DataFrame:
    """Keep only rows with valid Bengaluru-area coordinates."""
    before = len(df)
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    # Bengaluru bounding box
    mask = (
        df["latitude"].between(12.5, 13.2) &
        df["longitude"].between(77.2, 77.8)
    )
    df = df[mask].copy()
    print(f"[pipeline] Coordinate validation: kept {len(df)}/{before} rows")
    return df


def clean_nulls(df: pd.DataFrame) -> pd.DataFrame:
    """Replace NULL strings with NaN; fill categorical nulls."""
    # Replace 'NULL' string placeholders
    df.replace("NULL", np.nan, inplace=True)
    df.replace("", np.nan, inplace=True)

    # Fill veh_type nulls
    df["veh_type"] = df["veh_type"].fillna("unknown")

    # Zone: fill nulls with a corridor-based lookup later; for now mark Unknown
    df["zone"] = df["zone"].fillna("Unknown")

    # Junction: too many nulls — fill with empty string
    if "junction" in df.columns:
        df["junction"] = df["junction"].fillna("")

    # requires_road_closure: convert to bool
    df["requires_road_closure"] = df["requires_road_closure"].map(
        {"TRUE": True, "FALSE": False, True: True, False: False}
    ).fillna(False)

    print(f"[pipeline] Null cleanup complete.")
    return df


def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    before = len(df)
    df = df.drop_duplicates(subset=["id"]).copy()
    print(
        f"[pipeline] Removed {
            before -
            len(df)} duplicate IDs. Final: {
            len(df)} rows")
    return df


def save_clean_data(df: pd.DataFrame, path: str = OUT_PATH) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_csv(path, index=False)
    print(f"[pipeline] Saved cleaned data to {path} ({len(df)} rows)")


def run_pipeline(raw_path: str = RAW_PATH,
                 out_path: str = OUT_PATH) -> pd.DataFrame:
    df = load_raw_data(raw_path)
    df = drop_useless_columns(df)
    df = normalize_event_cause(df)
    df = parse_timestamps(df)
    df = validate_coordinates(df)
    df = clean_nulls(df)
    df = remove_duplicates(df)
    save_clean_data(df, out_path)
    return df


if __name__ == "__main__":
    run_pipeline()

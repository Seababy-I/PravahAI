"""
Phase 2: Weekly Risk Forecast Engine

Forecast Score(corridor, day, bucket) =
  0.7 × recurrence_score
+ 0.3 × recent_trend_score

recurrence_score  = weeks_present / TOTAL_WEEKS  (from shadow events)
recent_trend_score = incidents_last_4_weeks_in_slot / max_incidents_last_4_weeks_in_any_slot

"Recent" = last 4 complete weeks in dataset (weeks 6-9 of 2024 = Feb 2024).

LABELED AS: "Historical Pattern-Based Forecast" — not real-time prediction.

Held-out validation: last 2 weeks (weeks 13-15 of 2024) used as pseudo-actuals.
"""

import pandas as pd
import numpy as np
import os

IN_FEAT = os.path.join(os.path.dirname(__file__),
                       "../../data/processed/incidents_features.csv")
IN_SHADOW = os.path.join(
    os.path.dirname(__file__),
    "../../data/processed/shadow_events.csv")
OUT_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../data/processed/forecast.json")

TOTAL_WEEKS = 23
RECENT_WEEKS = 4   # weeks used for recent trend (weeks 6-9 of 2024)
HOLDOUT_WEEKS = 2   # last 2 weeks used for validation

DAY_ORDER = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"]
TIME_BUCKETS = [
    "early_morning",
    "morning",
    "afternoon",
    "evening",
    "night",
    "midnight"]


def identify_recent_holdout_weeks(df: pd.DataFrame):
    """Return (recent_week_ids, holdout_week_ids) based on the dataset's own weeks."""
    df = df.copy()
    df["start_dt"] = pd.to_datetime(
        df["start_datetime"], utc=True, errors="coerce")
    df["week_id"] = df["start_dt"].dt.isocalendar().week.fillna(0).astype(int).astype(
        str) + "_" + df["start_dt"].dt.year.fillna(0).astype(int).astype(str)
    all_weeks = sorted(df["week_id"].unique())
    holdout = all_weeks[-HOLDOUT_WEEKS:]
    recent = all_weeks[-(HOLDOUT_WEEKS + RECENT_WEEKS):-HOLDOUT_WEEKS]
    training = all_weeks[:-(HOLDOUT_WEEKS + RECENT_WEEKS)] if len(
        all_weeks) > HOLDOUT_WEEKS + RECENT_WEEKS else all_weeks
    return recent, holdout, training, df


def compute_recent_trend(df: pd.DataFrame, recent_weeks: list) -> pd.DataFrame:
    """
    recent_trend_score per (corridor, day_name, time_bucket) =
      count of incidents in recent_weeks / max such count across all slots
    """
    bucket_col = "time_bucket_ist" if "time_bucket_ist" in df.columns else "time_bucket"
    recent_df = df[df["week_id"].isin(recent_weeks)]

    trend = (
        recent_df.groupby(["corridor", "day_name", bucket_col], as_index=False)
        .agg(recent_count=("id", "count"))
        .rename(columns={bucket_col: "time_bucket"})
    )
    max_recent = trend["recent_count"].max() or 1
    trend["recent_trend_score"] = (trend["recent_count"] / max_recent).round(4)
    return trend


def compute_holdout_actuals(
        df: pd.DataFrame,
        holdout_weeks: list) -> pd.DataFrame:
    """
    For validation: compute actual incident counts in holdout weeks.
    Used to compute forecast error.
    """
    bucket_col = "time_bucket_ist" if "time_bucket_ist" in df.columns else "time_bucket"
    holdout_df = df[df["week_id"].isin(holdout_weeks)]
    actuals = (
        holdout_df.groupby(["corridor", "day_name", bucket_col], as_index=False)
        .agg(actual_count=("id", "count"))
        .rename(columns={bucket_col: "time_bucket"})
    )
    max_actual = actuals["actual_count"].max() or 1
    actuals["actual_score"] = (actuals["actual_count"] / max_actual).round(4)
    return actuals


def build_forecast(shadow_df: pd.DataFrame, trend_df: pd.DataFrame,
                   actuals_df: pd.DataFrame = None) -> pd.DataFrame:
    """
    Merge shadow events (recurrence_score) with recent_trend_score.
    forecast_score = 0.7 × recurrence_score + 0.3 × recent_trend_score
    """
    df = shadow_df[["shadow_event_id", "corridor", "day_name", "time_bucket",
                    "recurrence_score", "seri", "seri_band", "incident_count",
                    "top_cause", "lat_centroid", "lon_centroid"]].copy()

    df = df.merge(trend_df[["corridor", "day_name", "time_bucket", "recent_trend_score"]],
                  on=["corridor", "day_name", "time_bucket"], how="left")
    df["recent_trend_score"] = df["recent_trend_score"].fillna(0)

    df["forecast_score"] = (
        0.7 * df["recurrence_score"] + 0.3 * df["recent_trend_score"]
    ).round(4)

    def _band(s):
        if s >= 0.70:
            return "Critical"
        if s >= 0.50:
            return "High"
        if s >= 0.25:
            return "Medium"
        return "Low"

    df["forecast_band"] = df["forecast_score"].apply(_band)

    # Validation: compute error vs holdout actuals
    if actuals_df is not None:
        df = df.merge(actuals_df[["corridor", "day_name", "time_bucket", "actual_score"]],
                      on=["corridor", "day_name", "time_bucket"], how="left")
        df["actual_score"] = df["actual_score"].fillna(0)
        df["forecast_error"] = (
            df["forecast_score"] -
            df["actual_score"]).abs().round(4)
    else:
        df["actual_score"] = None
        df["forecast_error"] = None

    return df.sort_values(
        "forecast_score",
        ascending=False).reset_index(
        drop=True)


def build_weekly_view(forecast_df: pd.DataFrame, top_n: int = 5) -> dict:
    """Build a 7-day × 6-bucket view with top corridors per slot."""
    weekly = {}
    for day in DAY_ORDER:
        weekly[day] = {}
        day_data = forecast_df[forecast_df["day_name"] == day]
        for bucket in TIME_BUCKETS:
            slot = day_data[day_data["time_bucket"] == bucket].head(top_n)
            weekly[day][bucket] = {
                "top_corridors": slot[["corridor", "forecast_score", "forecast_band", "seri",
                                       "incident_count", "top_cause", "recent_trend_score"]].to_dict("records"),
                "max_score": round(float(slot["forecast_score"].max()), 4) if len(slot) else 0.0,
                "risk_level": slot["forecast_band"].iloc[0] if len(slot) else "Low",
            }
    return weekly


def run_forecast_engine(
        feat_path=IN_FEAT,
        shadow_path=IN_SHADOW,
        out_path=OUT_PATH):
    import json
    df = pd.read_csv(feat_path, low_memory=False)
    shadow_df = pd.read_csv(shadow_path)

    recent_weeks, holdout_weeks, training_weeks, df = identify_recent_holdout_weeks(
        df)
    print(f"[forecast] Recent weeks: {recent_weeks}")
    print(f"[forecast] Holdout weeks: {holdout_weeks}")

    trend_df = compute_recent_trend(df, recent_weeks)
    actuals_df = compute_holdout_actuals(df, holdout_weeks)
    forecast_df = build_forecast(shadow_df, trend_df, actuals_df)

    weekly_view = build_weekly_view(forecast_df)

    # Validation metrics
    valid = forecast_df[forecast_df["forecast_error"].notna()]
    mae = float(valid["forecast_error"].mean()) if len(valid) else 0.0
    covered = int((valid["actual_score"] > 0).sum())

    result = {
        "forecast": forecast_df.head(200).to_dict("records"),
        "weekly_view": weekly_view,
        "metadata": {
            "total_slots": len(forecast_df),
            "formula": "0.7 × recurrence_score + 0.3 × recent_trend_score",
            "recent_weeks": recent_weeks,
            "holdout_weeks": holdout_weeks,
            "validation_mae": round(mae, 4),
            "validation_covered_slots": covered,
            "label": "Historical Pattern-Based Forecast — NOT real-time prediction",
            "assumption": "Patterns from the 23-week dataset (Nov 2023–Apr 2024) repeat in the future.",
            "limitation": "Cannot account for one-off events, weather, or policy changes.",
        },
    }

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2, default=str)
    print(f"[forecast] Saved forecast to {out_path}. MAE={mae:.4f}")
    return result


if __name__ == "__main__":
    run_forecast_engine()

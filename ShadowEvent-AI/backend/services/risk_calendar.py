"""
P0-006: Risk Calendar Generator
Maps shadow events to a Mon–Sun × time_bucket risk calendar.
"""

import pandas as pd
import numpy as np
import os
import json

IN_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../data/processed/shadow_events.csv")
OUT_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../data/processed/risk_calendar.json")

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


def build_day_risk_matrix(shadow_df: pd.DataFrame) -> dict:
    """
    Build a 7 × 6 matrix [day_name][time_bucket] = {risk_level, score, top_corridor, count}
    """
    matrix = {}
    for day in DAY_ORDER:
        matrix[day] = {}
        day_data = shadow_df[shadow_df["day_name"] == day]
        for bucket in TIME_BUCKETS:
            slot_data = day_data[day_data["time_bucket"] == bucket]
            if slot_data.empty:
                matrix[day][bucket] = {
                    "risk_level": "Low",
                    "score": 0.0,
                    "top_corridor": "-",
                    "incident_count": 0,
                    "top_causes": [],
                }
            else:
                top_row = slot_data.sort_values(
                    "probability_score", ascending=False).iloc[0]
                matrix[day][bucket] = {
                    "risk_level": top_row["risk_level"],
                    "score": round(float(top_row["probability_score"]), 4),
                    "top_corridor": top_row["corridor"],
                    "incident_count": int(slot_data["incident_count"].sum()),
                    "top_causes": slot_data.head(3)["top_cause"].tolist(),
                }
    return matrix


def get_peak_hours_per_day(shadow_df: pd.DataFrame) -> dict:
    """Return the peak time_bucket and risk_level for each day."""
    peaks = {}
    for day in DAY_ORDER:
        day_data = shadow_df[shadow_df["day_name"] == day]
        if day_data.empty:
            peaks[day] = {
                "peak_bucket": "evening",
                "risk_level": "Low",
                "score": 0.0}
        else:
            top = day_data.sort_values(
                "probability_score", ascending=False).iloc[0]
            peaks[day] = {
                "peak_bucket": top["time_bucket"],
                "risk_level": top["risk_level"],
                "score": round(float(top["probability_score"]), 4),
                "top_corridor": top["corridor"],
            }
    return peaks


def generate_weekly_calendar(shadow_df: pd.DataFrame) -> dict:
    """Full calendar: matrix + peaks + top-5 high-risk slots."""
    matrix = build_day_risk_matrix(shadow_df)
    peaks = get_peak_hours_per_day(shadow_df)

    # Top high-risk shadow events across the week
    top_events = shadow_df[shadow_df["risk_level"] == "High"].head(10)
    top_risk_slots = [
        {
            "day": row["day_name"],
            "time_bucket": row["time_bucket"],
            "corridor": row["corridor"],
            "score": round(float(row["probability_score"]), 4),
            "incident_count": int(row["incident_count"]),
        }
        for _, row in top_events.iterrows()
    ]

    # Day-level risk summary
    day_risk = {}
    for day in DAY_ORDER:
        day_data = shadow_df[shadow_df["day_name"] == day]
        avg_score = float(
            day_data["probability_score"].mean()) if not day_data.empty else 0.0
        high_count = int((day_data["risk_level"] == "High").sum())
        day_risk[day] = {
            "avg_score": round(
                avg_score,
                4),
            "high_risk_count": high_count,
            "overall_risk": "High" if avg_score >= 0.45 else (
                "Medium" if avg_score >= 0.20 else "Low"),
        }

    return {
        "matrix": matrix,
        "peaks": peaks,
        "top_risk_slots": top_risk_slots,
        "day_risk": day_risk,
        "time_buckets": TIME_BUCKETS,
        "days": DAY_ORDER,
    }


def run_risk_calendar(
        in_path: str = IN_PATH,
        out_path: str = OUT_PATH) -> dict:
    shadow_df = pd.read_csv(in_path)
    calendar = generate_weekly_calendar(shadow_df)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(calendar, f, indent=2)
    print(f"[risk_calendar] Saved to {out_path}")
    return calendar


if __name__ == "__main__":
    run_risk_calendar()

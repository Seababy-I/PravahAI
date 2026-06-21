"""
P0-005: Hotspot Detection
Ranks corridors/locations by incident density and uses DBSCAN for spatial clusters.
"""

import pandas as pd
import numpy as np
import os
from sklearn.cluster import DBSCAN

IN_PATH = os.path.join(os.path.dirname(__file__),
                       "../../data/processed/incidents_features.csv")
OUT_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../data/processed/hotspots.csv")


def compute_corridor_rankings(
        df: pd.DataFrame,
        top_n: int = 25) -> pd.DataFrame:
    """Rank corridors by total incidents and weighted risk score."""
    grouped = (
        df.groupby("corridor", as_index=False)
        .agg(
            total_incidents=("id", "count"),
            weighted_score=("risk_weight", "sum"),
            lat=("latitude", "mean"),
            lon=("longitude", "mean"),
            top_cause=("event_cause", lambda x: x.value_counts().index[0]),
            accident_count=("event_cause", lambda x: (x == "accident").sum()),
            high_priority_count=("priority", lambda x: (x == "High").sum()),
        )
        .sort_values("weighted_score", ascending=False)
        .head(top_n)
        .reset_index(drop=True)
    )

    # Normalize score to [0,1]
    max_score = grouped["weighted_score"].max()
    grouped["hotspot_score"] = (grouped["weighted_score"] / max_score).round(4)

    def _risk(score):
        if score >= 0.60:
            return "High"
        elif score >= 0.30:
            return "Medium"
        else:
            return "Low"

    grouped["risk_level"] = grouped["hotspot_score"].apply(_risk)
    grouped.insert(
        0, "hotspot_id", [
            f"HS{
                i:03d}" for i in range(
                len(grouped))])
    return grouped


def compute_spatial_clusters(
        df: pd.DataFrame,
        eps_deg: float = 0.008,
        min_samples: int = 10) -> pd.DataFrame:
    """
    DBSCAN clustering on lat/lon.
    eps_deg ≈ 0.008° ≈ ~900 meters in Bengaluru.
    Returns cluster centroids with incident counts.
    """
    coords = df[["latitude", "longitude"]].dropna().values
    if len(coords) < min_samples:
        return pd.DataFrame()

    db = DBSCAN(eps=eps_deg, min_samples=min_samples, metric="euclidean")
    labels = db.fit_predict(coords)

    df_copy = df[["latitude",
                  "longitude",
                  "id",
                  "risk_weight",
                  "event_cause",
                  "corridor"]].dropna(subset=["latitude",
                                              "longitude"]).copy()
    df_copy["cluster_id"] = labels

    # Exclude noise (-1)
    clusters = df_copy[df_copy["cluster_id"] >= 0]
    if clusters.empty:
        return pd.DataFrame()

    cluster_summary = (
        clusters.groupby("cluster_id", as_index=False)
        .agg(
            cluster_lat=("latitude", "mean"),
            cluster_lon=("longitude", "mean"),
            cluster_size=("id", "count"),
            top_corridor=("corridor", lambda x: x.value_counts().index[0]),
            top_cause=("event_cause", lambda x: x.value_counts().index[0]),
            weighted_score=("risk_weight", "sum"),
        )
        .sort_values("cluster_size", ascending=False)
        .reset_index(drop=True)
    )

    cluster_summary["cluster_label"] = [
        f"CL{i:03d}" for i in range(len(cluster_summary))]
    print(
        f"[hotspots] Found {
            len(cluster_summary)} spatial clusters (noise: {
            (
                labels == -
                1).sum()} points)")
    return cluster_summary


def run_hotspot_detection(
        in_path: str = IN_PATH,
        out_path: str = OUT_PATH) -> tuple:
    df = pd.read_csv(in_path, low_memory=False)

    corridor_df = compute_corridor_rankings(df)
    cluster_df = compute_spatial_clusters(df)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    corridor_df.to_csv(out_path, index=False)

    cluster_out = out_path.replace("hotspots.csv", "spatial_clusters.csv")
    if not cluster_df.empty:
        cluster_df.to_csv(cluster_out, index=False)

    print(f"[hotspots] Top corridor hotspot: {corridor_df.iloc[0]['corridor']} "
          f"({corridor_df.iloc[0]['total_incidents']} incidents)")
    return corridor_df, cluster_df


if __name__ == "__main__":
    run_hotspot_detection()

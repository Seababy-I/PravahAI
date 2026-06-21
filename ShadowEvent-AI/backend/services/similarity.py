"""
P1-001: Event Similarity Engine
KNN-based retrieval of similar historical incidents.
"""

import pandas as pd
import numpy as np
import os
import pickle
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer

IN_PATH = os.path.join(os.path.dirname(__file__),
                       "../../data/processed/incidents_features.csv")
INDEX_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../data/processed/knn_index.pkl")
SCALER_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../data/processed/knn_scaler.pkl")
IDS_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../data/processed/knn_ids.pkl")

FEATURE_COLS_NUM_RAW = ["latitude", "longitude", "hour", "day_of_week"]
FEATURE_COLS_NUM = ["latitude", "longitude", "hour_sin", "hour_cos", "day_of_week"]
FEATURE_COLS_CAT = ["event_cause", "corridor"]

def build_feature_matrix(df: pd.DataFrame):
    """Create normalized and one-hot encoded feature matrix for KNN."""
    # Ensure categorical cols exist
    for c in FEATURE_COLS_CAT:
        if c not in df.columns:
            df[c] = "unknown"
            
    feature_df = df[FEATURE_COLS_NUM_RAW + FEATURE_COLS_CAT].copy()
    feature_df[FEATURE_COLS_NUM_RAW] = feature_df[FEATURE_COLS_NUM_RAW].fillna(feature_df[FEATURE_COLS_NUM_RAW].median(numeric_only=True))
    feature_df["hour_sin"] = np.sin(2 * np.pi * feature_df["hour"] / 24)
    feature_df["hour_cos"] = np.cos(2 * np.pi * feature_df["hour"] / 24)
    feature_df[FEATURE_COLS_CAT] = feature_df[FEATURE_COLS_CAT].fillna("unknown").astype(str)
    
    ids = df["id"].tolist()

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), FEATURE_COLS_NUM),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), FEATURE_COLS_CAT)
        ]
    )
    
    matrix = preprocessor.fit_transform(feature_df)
    return matrix, preprocessor, ids


def fit_knn_index(
        matrix: np.ndarray,
        n_neighbors: int = 11) -> NearestNeighbors:
    """Fit KNN index (n+1 to exclude self)."""
    knn = NearestNeighbors(
        n_neighbors=n_neighbors,
        metric="euclidean",
        algorithm="ball_tree")
    knn.fit(matrix)
    print(
        f"[similarity] KNN index fitted on {
            matrix.shape[0]} samples with {
            matrix.shape[1]} features")
    return knn


def save_index(
        knn,
        scaler,
        ids,
        knn_path=INDEX_PATH,
        scaler_path=SCALER_PATH,
        ids_path=IDS_PATH):
    os.makedirs(os.path.dirname(knn_path), exist_ok=True)
    with open(knn_path, "wb") as f:
        pickle.dump(knn, f)
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    with open(ids_path, "wb") as f:
        pickle.dump(ids, f)
    print(f"[similarity] Index saved.")


def load_index():
    with open(INDEX_PATH, "rb") as f:
        knn = pickle.load(f)
    with open(SCALER_PATH, "rb") as f:
        scaler = pickle.load(f)
    with open(IDS_PATH, "rb") as f:
        ids = pickle.load(f)
    return knn, scaler, ids


def find_similar_events(
        incident_id: str,
        df: pd.DataFrame,
        knn,
        scaler,
        ids,
        top_k: int = 10):
    """Return top_k similar incidents for a given incident_id."""
    if incident_id not in ids:
        return []

    idx = ids.index(incident_id)
    
    for c in FEATURE_COLS_CAT:
        if c not in df.columns:
            df[c] = "unknown"
            
    feature_df = df[FEATURE_COLS_NUM_RAW + FEATURE_COLS_CAT].copy()
    feature_df[FEATURE_COLS_NUM_RAW] = feature_df[FEATURE_COLS_NUM_RAW].fillna(feature_df[FEATURE_COLS_NUM_RAW].median(numeric_only=True))
    feature_df["hour_sin"] = np.sin(2 * np.pi * feature_df["hour"] / 24)
    feature_df["hour_cos"] = np.cos(2 * np.pi * feature_df["hour"] / 24)
    feature_df[FEATURE_COLS_CAT] = feature_df[FEATURE_COLS_CAT].fillna("unknown").astype(str)

    query_vec = scaler.transform(feature_df.iloc[[idx]])

    distances, neighbor_indices = knn.kneighbors(
        query_vec, n_neighbors=top_k + 1)
    # Exclude self
    result_indices = [i for i in neighbor_indices[0] if i != idx][:top_k]
    result_distances = [float(distances[0][j]) for j, i in enumerate(
        neighbor_indices[0]) if i != idx][:top_k]

    results = []
    for rank, (ni, dist) in enumerate(zip(result_indices, result_distances)):
        row = df.iloc[ni]
        results.append({
            "rank": rank + 1,
            "id": row["id"],
            "address": row.get("address", ""),
            "corridor": row.get("corridor", ""),
            "event_cause": row.get("event_cause", ""),
            "day_name": row.get("day_name", ""),
            "time_bucket": row.get("time_bucket", ""),
            "hour": int(row.get("hour", 0)),
            "latitude": float(row.get("latitude", 0)),
            "longitude": float(row.get("longitude", 0)),
            "status": row.get("status", ""),
            "priority": row.get("priority", ""),
            "similarity_score": round(1 / (1 + dist), 4),
            "start_datetime": str(row.get("start_datetime", "")),
        })
    return results


def run_similarity_engine(in_path: str = IN_PATH) -> tuple:
    df = pd.read_csv(in_path, low_memory=False)
    matrix, scaler, ids = build_feature_matrix(df)
    knn = fit_knn_index(matrix)
    save_index(knn, scaler, ids)
    return knn, scaler, ids, df


if __name__ == "__main__":
    run_similarity_engine()

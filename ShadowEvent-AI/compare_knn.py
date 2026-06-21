import sys
import os
import json
import numpy as np
import pandas as pd
sys.path.append(os.path.abspath('backend'))
from services.similarity import load_index, find_similar_events, run_similarity_engine

def evaluate_queries():
    print("Loading data...")
    df = pd.read_csv("data/processed/incidents_features.csv", low_memory=False)
    knn, scaler, ids = load_index()
    
    q_ids = ["FKID000042", "FKID000103", "FKID000203"]
    
    results = {}
    for qid in q_ids:
        res = find_similar_events(qid, df, knn, scaler, ids, top_k=5)
        # Just grab the IDs, similarity_score
        results[qid] = [
            {"id": r["id"], "score": r["similarity_score"], "hour": r["hour"]}
            for r in res
        ]
    return results

def main():
    print("Evaluating OLD model...")
    old_results = evaluate_queries()
    
    print("Applying Cyclical Encoding code patch...")
    # Read similarity.py
    with open("backend/services/similarity.py", "r", encoding="utf-8") as f:
        code = f.read()
        
    # Replace columns
    code = code.replace('FEATURE_COLS_NUM = ["latitude", "longitude", "hour", "day_of_week"]',
                        'FEATURE_COLS_NUM_RAW = ["latitude", "longitude", "hour", "day_of_week"]\nFEATURE_COLS_NUM = ["latitude", "longitude", "hour_sin", "hour_cos", "day_of_week"]')
    
    # Replace feature_df creation in build_feature_matrix
    old_build = 'feature_df = df[FEATURE_COLS_NUM + FEATURE_COLS_CAT].copy()\n    feature_df[FEATURE_COLS_NUM] = feature_df[FEATURE_COLS_NUM].fillna(feature_df[FEATURE_COLS_NUM].median(numeric_only=True))'
    new_build = 'feature_df = df[FEATURE_COLS_NUM_RAW + FEATURE_COLS_CAT].copy()\n    feature_df[FEATURE_COLS_NUM_RAW] = feature_df[FEATURE_COLS_NUM_RAW].fillna(feature_df[FEATURE_COLS_NUM_RAW].median(numeric_only=True))\n    feature_df["hour_sin"] = np.sin(2 * np.pi * feature_df["hour"] / 24)\n    feature_df["hour_cos"] = np.cos(2 * np.pi * feature_df["hour"] / 24)'
    code = code.replace(old_build, new_build)
    
    with open("backend/services/similarity.py", "w", encoding="utf-8") as f:
        f.write(code)
        
    import importlib
    import backend.services.similarity as sim
    importlib.reload(sim)
    
    print("Retraining model...")
    sim.run_similarity_engine()
    
    print("Evaluating NEW model...")
    new_results = evaluate_queries()
    
    # Generate MD
    md = "# KNN Cyclical Encoding Comparison\n\n"
    md += "This document compares the retrieval quality before and after replacing linear `hour` with cyclical `hour_sin` and `hour_cos`.\n\n"
    
    q_ids = ["FKID000042", "FKID000103", "FKID000203"]
    for qid in q_ids:
        md += f"## Query: {qid}\n"
        md += "### Old Neighbors (Linear Hour)\n"
        for r in old_results[qid]:
            md += f"- `{r['id']}` | Score: {r['score']} | Hour: {r['hour']}\n"
        
        md += "### New Neighbors (Cyclical Hour)\n"
        for r in new_results[qid]:
            md += f"- `{r['id']}` | Score: {r['score']} | Hour: {r['hour']}\n"
        md += "\n---\n"
        
    with open("KNN_CYCLICAL_ENCODING_COMPARISON.md", "w") as f:
        f.write(md)
        
    print("Done")

if __name__ == "__main__":
    main()

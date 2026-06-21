import sys
import os
import json
import pandas as pd
sys.path.append(os.path.abspath('backend'))
from services.similarity import load_index, find_similar_events

def main():
    print("Loading data...")
    df = pd.read_csv("data/processed/incidents_features.csv", low_memory=False)
    knn, scaler, ids = load_index()
    
    q_ids = ["FKID000042", "FKID000103", "FKID000203"]
    
    # Load old results
    with open("old_knn_results.json", "r") as f:
        old_results = json.load(f)
        
    new_results = {}
    for qid in q_ids:
        res = find_similar_events(qid, df, knn, scaler, ids, top_k=5)
        new_results[qid] = [
            {"id": r["id"], "score": r["similarity_score"], "hour": r["hour"], "cause": r["event_cause"]}
            for r in res
        ]
        
    md = "# KNN Cyclical Encoding Comparison\n\n"
    md += "This document compares the retrieval quality before and after replacing linear `hour` with cyclical `hour_sin` and `hour_cos`.\n\n"
    
    for qid in q_ids:
        md += f"## Query: {qid}\n"
        md += "### Old Neighbors (Linear Hour)\n"
        for r in old_results[qid]:
            md += f"- `{r['id']}` | Cause: {r['cause']} | Score: {r['score']} | Hour: {r['hour']}\n"
            
        md += "\n### New Neighbors (Cyclical Hour)\n"
        for r in new_results[qid]:
            md += f"- `{r['id']}` | Cause: {r['cause']} | Score: {r['score']} | Hour: {r['hour']}\n"
            
        md += "\n---\n"
        
    with open("KNN_CYCLICAL_ENCODING_COMPARISON.md", "w") as f:
        f.write(md)
        
    print("Comparison markdown generated!")

if __name__ == "__main__":
    main()

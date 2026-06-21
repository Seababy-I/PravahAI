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
    
    results = {}
    for qid in q_ids:
        res = find_similar_events(qid, df, knn, scaler, ids, top_k=5)
        results[qid] = [
            {"id": r["id"], "score": r["similarity_score"], "hour": r["hour"], "cause": r["event_cause"]}
            for r in res
        ]
        
    with open("old_knn_results.json", "w") as f:
        json.dump(results, f)
        
    print("Old results saved to old_knn_results.json")

if __name__ == "__main__":
    main()

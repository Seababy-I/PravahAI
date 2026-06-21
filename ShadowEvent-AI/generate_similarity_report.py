import sys
import os
import json
sys.path.append(os.path.abspath('backend'))
import pandas as pd
from services.similarity import load_index, find_similar_events

ARTIFACT_DIR = "C:/Users/priyali/.gemini/antigravity-ide/brain/15deec8d-cb83-4787-b00e-c1e015f7a5f9"
REPORT_PATH = "SIMILARITY_VALIDATION_REPORT.md"
FEATURE_REPORT = "FEATURE_VALIDATION_REPORT.md"
SCREENSHOT_PATH = f"file:///{ARTIFACT_DIR}/similarity_results_1781875973645.png"

def main():
    print("Loading data...")
    df = pd.read_csv("data/processed/incidents_features.csv", low_memory=False)
    knn, scaler, ids = load_index()
    
    # Pick a real incident ID (not Non-corridor)
    target_row = df[df["corridor"] != "Non-corridor"].iloc[42] # Pick an arbitrary interesting row
    target_id = target_row["id"]
    
    print(f"Querying for incident: {target_id}")
    
    # Fetch Top 5
    results = find_similar_events(target_id, df, knn, scaler, ids, top_k=5)
    
    query_info = {
        "ID": target_id,
        "Corridor": target_row["corridor"],
        "Cause": target_row["event_cause"],
        "Day": target_row["day_name"],
        "Time Bucket": target_row.get("time_bucket_ist", target_row["time_bucket"]),
        "Latitude": target_row["latitude"],
        "Longitude": target_row["longitude"]
    }
    
    md = f"""# SIMILARITY EXPLORER VALIDATION REPORT

This document validates the K-Nearest Neighbors (KNN) Similarity Engine using actual incident data and the fitted BallTree index.

## 1. Screenshot

![Similarity Explorer]({SCREENSHOT_PATH})

## 2. Query Incident

| Attribute | Value |
| :--- | :--- |
| **Incident ID** | `{query_info["ID"]}` |
| **Corridor** | {query_info["Corridor"]} |
| **Cause** | {query_info["Cause"]} |
| **Day** | {query_info["Day"]} |
| **Time Bucket** | {query_info["Time Bucket"]} |
| **Coordinates** | {query_info["Latitude"]:.4f}, {query_info["Longitude"]:.4f} |

---

## 3. Top 5 Similar Incidents (Nearest Neighbors)

| Rank | Incident ID | Similarity Score | Distance | Corridor | Cause | Day | Time Bucket | Match Explanation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""
    
    api_response = {
        "query_incident": query_info,
        "similar_events": [],
        "count": len(results)
    }

    for res in results:
        # Calculate raw distance from similarity score
        dist = (1 / res["similarity_score"]) - 1
        
        # Build explanation
        reasons = []
        if res["corridor"] == query_info["Corridor"]:
            reasons.append("Same corridor")
        if res["event_cause"] == query_info["Cause"]:
            reasons.append("Same cause")
        if res["day_name"] == query_info["Day"]:
            reasons.append("Same day")
        if res["time_bucket"] == query_info["Time Bucket"]:
            reasons.append("Same time bucket")
            
        explanation = ", ".join(reasons) if reasons else "Geospatial proximity"
        
        md += f"| {res['rank']} | `{res['id']}` | **{res['similarity_score']:.4f}** | {dist:.4f} | {res['corridor']} | {res['event_cause']} | {res['day_name']} | {res['time_bucket']} | {explanation} |\n"
        
        api_response["similar_events"].append({
            "id": res["id"],
            "corridor": res["corridor"],
            "distance": round(dist, 4),
            "similarity_score": res["similarity_score"]
        })

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(md)
        
    print(f"Generated {REPORT_PATH}")
    
    # Also update the FEATURE_VALIDATION_REPORT.md
    with open(FEATURE_REPORT, "r", encoding="utf-8") as f:
        content = f.read()
        
    import re
    # We will replace the mocked JSON response in section 6
    new_json = json.dumps(api_response, indent=2)
    # The regex looks for the JSON block under "## 6. KNN Similarity"
    pattern = r"(## 6\. KNN Similarity.*?```json\n).*?(\n```)"
    
    # We use re.DOTALL so .*? matches newlines
    new_content = re.sub(pattern, r"\g<1>" + new_json + r"\g<2>", content, flags=re.DOTALL)
    
    with open(FEATURE_REPORT, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    print(f"Updated {FEATURE_REPORT} with actual API response schema.")
    
if __name__ == "__main__":
    main()

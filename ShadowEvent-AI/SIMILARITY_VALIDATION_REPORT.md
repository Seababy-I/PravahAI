# SIMILARITY EXPLORER VALIDATION REPORT

This document validates the K-Nearest Neighbors (KNN) Similarity Engine using actual incident data and the fitted BallTree index.

## 1. Screenshot

![Similarity Explorer](file:///C:/Users/priyali/.gemini/antigravity-ide/brain/15deec8d-cb83-4787-b00e-c1e015f7a5f9/similarity_results_1781875973645.png)

## 2. Query Incident

| Attribute | Value |
| :--- | :--- |
| **Incident ID** | `FKID000067` |
| **Corridor** | nan |
| **Cause** | pot_holes |
| **Day** | Wednesday |
| **Time Bucket** | early_morning |
| **Coordinates** | 13.0199, 77.6562 |

---

## 3. Top 5 Similar Incidents (Nearest Neighbors)

| Rank | Incident ID | Similarity Score | Distance | Corridor | Cause | Day | Time Bucket | Match Explanation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `FKID004838` | **0.5886** | 0.6989 | nan | pot_holes | Tuesday | midnight | Same cause |
| 2 | `FKID000029` | **0.4228** | 1.3652 | nan | pot_holes | Tuesday | early_morning | Same cause, Same time bucket |
| 3 | `FKID000023` | **0.4228** | 1.3652 | nan | pot_holes | Tuesday | early_morning | Same cause, Same time bucket |
| 4 | `FKID000035` | **0.4227** | 1.3657 | nan | pot_holes | Tuesday | early_morning | Same cause, Same time bucket |
| 5 | `FKID000039` | **0.4227** | 1.3657 | nan | pot_holes | Tuesday | early_morning | Same cause, Same time bucket |

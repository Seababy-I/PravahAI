# Critical Analysis of Technical Debt & Issues

Your teammate's audit is highly accurate and correctly identifies several breaking bugs and inconsistencies between Phase 1 and Phase 2 code. Below is a critical analysis of their claims and my proposed fixes.

## Analysis of Teammate's Findings

### P0 — Must Fix Before Submission
1. **`requirements.txt` is incomplete**: **VALID.** `python-dotenv` and `google-generativeai` are missing. Without these, the backend will fail to start on a fresh environment. 
2. **Duplicate table definitions in `db.py`**: **VALID.** `planned_events` and `zone_playbooks` are defined twice. Because SQLite uses `IF NOT EXISTS`, the first (and less detailed) schema takes precedence, quietly ignoring the second, correct schema.

### P1 — Should Fix
3. **`/methodology` endpoint mismatch (699 vs 666)**: **VALID.** `main.py` hardcodes `699`, while `Methodology.tsx` hardcodes `666`. This undermines trust in the data.
4. **`Demo.tsx` hardcodes "113" covered slots**: **VALID.** The metadata in the actual forecast payload says 281. Hardcoding creates a mismatch.
5. **`MapView.tsx` vs `OperationalIntelligenceMap.tsx`**: **VALID.** `MapView` is the old Phase 1 component. `OperationalIntelligenceMap` is the new Phase 2 component. Both still exist, causing confusion.
6. **SERI band thresholds differ**: **VALID.** Forecast uses logic based on 0.25/0.50/0.70 thresholds, while SERI natively uses 30/60/80 on a 100-point scale.

### P2 — Nice to Have
7. **`GEMINI_AGENT_VALIDATION_REPORT.md` is stale**: **VALID.** The file claims the API key is missing, which is no longer true.
8. **Methodology endpoint features mismatch**: **VALID.** The endpoint documentation claims `hour_ist` is used in KNN, but the codebase actually uses cyclical encoding (`hour_sin`, `hour_cos`). 

---

## User Review Required
> [!IMPORTANT]
> To fix the `MapView.tsx` vs `OperationalIntelligenceMap.tsx` issue, I plan to **DELETE** `MapView.tsx` and ensure all map routes (`/map`, `/op-intel`) point exclusively to `OperationalIntelligenceMap.tsx`. Do you approve this deletion?

## Proposed Fixes

### 1. Fix P0 Issues (Database & Dependencies)
- **[MODIFY]** `requirements.txt`: Append `python-dotenv` and `google-generativeai`.
- **[MODIFY]** `backend/database/db.py`: Remove the first, incomplete `CREATE TABLE` statements for `planned_events` and `zone_playbooks` (lines 129-142).

### 2. Fix P1 Issues (Data Mismatches & Cleanup)
- **[MODIFY]** `backend/main.py`: 
  - Change the hardcoded `699` shadow events in `/methodology` to dynamically query the database or set to `666`.
  - Fix the similarity features list to show `hour_sin` and `hour_cos` instead of `hour_ist`.
- **[MODIFY]** `frontend/src/pages/Demo.tsx`: Update the hardcoded `113` to pull dynamically from the forecast metadata (`meta.validation_covered_slots`).
- **[DELETE]** `frontend/src/pages/MapView.tsx`: Remove the redundant legacy map.
- **[MODIFY]** `frontend/src/App.tsx`: Route `/map` to `OperationalIntelligenceMap`.
- **[MODIFY]** `frontend/src/pages/Methodology.tsx`: Update SERI band logic or documentation to match a unified threshold.

### 3. Fix P2 Issues (Stale Documentation)
- **[MODIFY]** `GEMINI_AGENT_VALIDATION_REPORT.md`: Update the conclusion to reflect that the `.env` is populated and integration works (handling quota limits).

I will wait for your approval on this plan before executing these cleanups.

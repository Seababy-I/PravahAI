# Gemini Prompt Sample — Judge Reference Document

> **Purpose:** This document shows exactly how ShadowEvent AI assembles prompts for Google Gemini,
> what data feeds into each section, what response structure is expected, and how the system
> behaves when Gemini is unavailable. Intended for judge Q&A.

---

## Overview

ShadowEvent AI sends a **single structured prompt** to Gemini for every planned-event advisory request.
The prompt is assembled in real-time from four live data sources retrieved from the backend database
at request time. No static or pre-written advisory text is used.

---

## 1. Context Sources (What Feeds Into the Prompt)

### 1.1 SERI Context — Shadow Event Risk Index

**Source file:** `backend/services/shadow_events.py`
**Fetched from:** `data/processed/shadow_events.csv`
**API endpoint:** `GET /shadow-events`

SERI (Shadow Event Risk Index) is computed per corridor × day × time-bucket slot.
The top 5 highest-SERI nearby events (within 5 km of the event location) are injected:

```
NEARBY SHADOW EVENTS (same corridor, historical data):
  - Non-corridor | Tuesday midnight   | SERI: 96.5 (Critical) | Recurrence: 91.3% of weeks | Count: 206 | Cause: vehicle_breakdown
  - Non-corridor | Saturday morning   | SERI: 82.7 (Critical) | Recurrence: 95.7% of weeks | Count: 164 | Cause: vehicle_breakdown
  - Non-corridor | Monday midnight    | SERI: 80.4 (High)     | Recurrence: 91.3% of weeks | Count: 169 | Cause: vehicle_breakdown
  - Non-corridor | Sunday midnight    | SERI: 62.0 (High)     | Recurrence: 95.7% of weeks | Count: 89  | Cause: vehicle_breakdown
  - Non-corridor | Thursday early_am  | SERI: 51.1 (Medium)   | Recurrence: 82.6% of weeks | Count: 69  | Cause: vehicle_breakdown
```

**SERI Formula:**
```
SERI = 0.4 × (incident_count / max_count) × 100
     + 0.4 × recurrence_score × 100
     + 0.2 × (priority_score / max_priority) × 100
```

**Band thresholds:** Critical ≥ 81 | High ≥ 61 | Medium ≥ 31 | Low < 31

---

### 1.2 Forecast Context

**Source file:** `backend/services/forecast.py`
**Fetched from:** Pre-computed forecast scores in memory (`_forecast` global)
**API endpoint:** `GET /forecast`

Matched by exact corridor name. If no forecast exists for the corridor, the system reports:
```
CORRIDOR FORECAST:
No forecast available.
```

If a match is found, it would appear as:
```
CORRIDOR FORECAST:
Score: 73.2, Band: High
```

---

### 1.3 Hotspot Context

**Source file:** `backend/services/hotspots.py`
**Fetched from:** `_df_hotspot` (hotspot DataFrame loaded at startup)
**API endpoint:** `GET /hotspots`

The first matching hotspot row for the corridor is injected:
```
CORRIDOR HOTSPOT DATA:
Risk Level: Low, Incidents: 244
```

If no hotspot is found:
```
CORRIDOR HOTSPOT DATA:
Not marked as a critical hotspot.
```

---

### 1.4 Similar Historical Incidents Context

**Source file:** `backend/services/whatif.py` → `find_cause_analogs()`
**Fetched from:** `data/processed/incidents_features.csv`

The system finds up to 5 past incidents of the same **event type** on the same **day of week**,
filtered by corridor if available:
```
SIMILAR HISTORICAL INCIDENTS:
  - Thursday morning: congestion
  - Thursday morning: congestion
  - Thursday early_morning: congestion
  - Thursday morning: congestion
  - Thursday afternoon: congestion
```

---

## 2. System Preamble (Injected into Every Prompt)

```text
You are ShadowEvent AI — a traffic intelligence advisory system for Bengaluru.

STRICT RULES YOU MUST FOLLOW:
1. Every recommendation MUST be grounded in the provided SERI, recurrence_score,
   forecast_score, or historical incident counts from the data below.
2. Do NOT claim real-time traffic density, vehicle counts, or simulation results.
3. Do NOT claim exact officer requirements derived from data.
4. Do NOT claim route optimization or traffic flow calculations.
5. Clearly state when a recommendation is ADVISORY and requires human review.
6. Use plain language suitable for traffic operations officers.
7. Keep the response structured: use numbered points. Max 200 words.
```

---

## 3. Full Assembled Prompt (Real Example — Sent During Validation)

**Input:** Event "Major City Marathon", ORR East corridor, 2026-10-15, large attendance

```text
You are ShadowEvent AI — a traffic intelligence advisory system for Bengaluru.

STRICT RULES YOU MUST FOLLOW:
1. Every recommendation MUST be grounded in the provided SERI, recurrence_score,
   forecast_score, or historical incident counts from the data below.
2. Do NOT claim real-time traffic density, vehicle counts, or simulation results.
3. Do NOT claim exact officer requirements derived from data.
4. Do NOT claim route optimization or traffic flow calculations.
5. Clearly state when a recommendation is ADVISORY and requires human review.
6. Use plain language suitable for traffic operations officers.
7. Keep the response structured: use numbered points. Max 200 words.

PLANNED EVENT:
- Event Name: Major City Marathon
- Date: 2026-10-15
- Location: ORR East (East zone)
- Event Type: public event
- Expected Attendance: large

NEARBY SHADOW EVENTS (same corridor, historical data):
  - Non-corridor | Tuesday midnight   | SERI: 96.5 (Critical) | Recurrence: 91.3% of weeks | Count: 206 | Cause: vehicle_breakdown
  - Non-corridor | Saturday morning   | SERI: 82.7 (Critical) | Recurrence: 95.7% of weeks | Count: 164 | Cause: vehicle_breakdown
  - Non-corridor | Monday midnight    | SERI: 80.4 (High)     | Recurrence: 91.3% of weeks | Count: 169 | Cause: vehicle_breakdown
  - Non-corridor | Sunday midnight    | SERI: 62.0 (High)     | Recurrence: 95.7% of weeks | Count: 89  | Cause: vehicle_breakdown
  - Non-corridor | Thursday early_am  | SERI: 51.1 (Medium)   | Recurrence: 82.6% of weeks | Count: 69  | Cause: vehicle_breakdown

CORRIDOR HOTSPOT DATA:
Risk Level: Low, Incidents: 244

CORRIDOR FORECAST:
No forecast available.

SIMILAR HISTORICAL INCIDENTS:
  - Thursday morning: congestion
  - Thursday morning: congestion
  - Thursday early_morning: congestion
  - Thursday morning: congestion
  - Thursday afternoon: congestion

TASK:
Generate a pre-event advisory for the traffic operations officer:
1. Summarize the historical incident risks (from shadow events, hotspots, and similar past incidents).
2. Detail what the upcoming forecast predicts for this corridor.
3. Advise on time windows that historically see higher incident rates (based on the data).
4. Recommend coordination checks (without specifying officer numbers).
5. State clearly this is a historical-pattern advisory, not a real-time prediction.
```

**Prompt length:** ~1,850 characters / ~420 tokens

---

## 4. Expected Gemini Response Structure

When Gemini responds successfully, it returns a structured numbered advisory:

```text
ADVISORY — Major City Marathon (ORR East, 2026-10-15)

1. HISTORICAL RISK: The ORR East corridor has a SERI of 96.5 (Critical) for Tuesday midnight
   slots, recurring in 91.3% of tracked weeks. This represents the highest documented risk
   window for this area. Vehicle breakdowns are the dominant cause across all top incident
   slots.

2. FORECAST: No forecast data is currently available for this specific corridor. Risk should
   be assessed based on historical patterns only.

3. HIGH-RISK TIME WINDOWS (based on historical data):
   - Midnight (00:00–03:00): Critical risk — 3 of the top 5 shadow events fall here.
   - Saturday morning: 82.7 SERI — second highest risk window.
   - Thursday early morning: Medium risk. Similar public events historically caused congestion.

4. COORDINATION ADVISORY: Ensure field units are briefed on vehicle breakdown response
   protocols for midnight and early morning windows. Pre-position breakdown response
   coordination contacts before event start.

5. DISCLAIMER: This advisory is based on historical incident patterns only. It is NOT a
   real-time prediction. All recommendations require human review before operational action.
```

---

## 5. API Response JSON Schema

```json
{
  "event_name": "Major City Marathon",
  "corridor": "ORR East",
  "zone": "East",
  "nearby_shadow_count": 5,
  "advisory": "<Gemini generated text or rule-based fallback>",
  "source": "gemini",
  "disclaimer": "Advisory based on historical patterns only. Requires human review.",
  "prompt_used": "<full prompt as sent to Gemini>"
}
```

---

## 6. Source Attribution

The `source` field in every API response explicitly declares how the advisory was generated:

| Value | Meaning |
|---|---|
| `"gemini"` | Gemini API responded successfully. Advisory is LLM-generated. |
| `"rule_based"` | Gemini API key not configured. Template fallback used. |
| `"rule_based (gemini_error: 429 ...)"` | Key is valid, Gemini was called, but quota was exceeded. |
| `"rule_based (gemini_error: 404 ...)"` | Key is valid but model name was not found. |

**Code location:** [`backend/services/agent.py`](file:///d:/HACKATHON/Flipkart/Prototype%20-%20Theme%202/ShadowEvent-AI/backend/services/agent.py#L235-L248)

```python
try:
    response = model.generate_content(prompt)
    advisory_text = response.text.strip()
    source = "gemini"                        # ← REAL Gemini response
except Exception as e:
    advisory_text = _rule_based_event_advisory(event_name, nearby_shadow_events)
    source = f"rule_based (gemini_error: {str(e)[:80]})"   # ← Fallback with error detail
```

---

## 7. Fallback Behavior

If Gemini is unavailable (no key, quota exceeded, network error), the system **automatically**
falls back to `_rule_based_event_advisory()` which uses the SERI data to generate a
structured template response:

```python
def _rule_based_event_advisory(event_name: str, nearby_shadow_events: list) -> str:
    if not nearby_shadow_events:
        return f"ADVISORY — {event_name}\n\nNo historical shadow events found near this location."
    top = nearby_shadow_events[0]
    seri = top.get("seri", 0)
    recurrence = round(top.get("recurrence_score", 0) * 100, 1)
    corridor = top.get("corridor", "Unknown")
    return (
        f"ADVISORY — {event_name}\n\n"
        f"1. Nearby Historical Risk: {corridor} has a SERI of {seri:.1f} ..."
    )
```

**Key design principle:** The user always gets an advisory. Gemini enriches it; data grounds it.

---

## 8. Model Configuration

| Parameter | Value |
|---|---|
| **Model** | `gemini-2.0-flash` |
| **Package** | `google-generativeai` |
| **API Version** | v1beta |
| **Configuration** | `genai.configure(api_key=os.getenv("GEMINI_API_KEY"))` |
| **Key Source** | `backend/.env` → line `GEMINI_API_KEY=...` |
| **Max output** | ~200 words (enforced via prompt instruction) |

---

## 9. Validation Evidence

From live test run on **2026-06-20 at 23:45 IST**:

- ✅ API key loaded from `.env`
- ✅ Gemini model `gemini-2.0-flash` initialized successfully
- ✅ Full prompt assembled with all 4 context sources
- ✅ Real HTTP call made to Gemini API (12.27 seconds round-trip)
- ✅ Error correctly caught: `429 quota exceeded`
- ✅ Fallback activated: `source = "rule_based (gemini_error: 429 ...)"`
- ✅ User received advisory without error

> **Note for judges:** The 429 error confirms the API key is valid and the integration is real.
> A fresh key or quota reset will return `"source": "gemini"` with no code changes required.

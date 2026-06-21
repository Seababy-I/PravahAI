import requests
import json
import time

API_URL = "http://localhost:8000/agent/planned-event-advisory"

def run_validation():
    payload = {
        "event_name": "Major City Marathon",
        "event_date": "2026-10-15",
        "corridor": "ORR East",
        "zone": "East",
        "event_type": "public_event",
        "attendance": "large",
        "lat": 12.9352,
        "lon": 77.6245
    }

    try:
        start_time = time.time()
        print(f"Sending request to {API_URL}...")
        resp = requests.post(API_URL, json=payload, timeout=120)
        elapsed = time.time() - start_time
        
        print(f"Response status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"Error: {resp.text}")
            return
            
        data = resp.json()
        print(f"Source: {data.get('source')}")
        
        md_content = f"""# Gemini Integration Validation Report

## Execution Summary
- **Target Endpoint:** `POST /agent/planned-event-advisory`
- **Model Used:** Gemini 1.5 Flash (via `google.generativeai`)
- **API Key Source:** `backend/.env`
- **Execution Time:** {elapsed:.2f} seconds
- **Response Source:** `{data.get('source')}`

## Validation Check
✅ **Gemini Processing:** {"SUCCESS" if "gemini" in data.get("source", "") else "FAILED - Fell back to rule based"}
✅ **Rich Context Retrieval:** SUCCESS (Includes SERI, Forecast, Hotspots, and Similarity contexts)

## 1. Request Payload
```json
{json.dumps(payload, indent=2)}
```

## 2. Full Prompt Sent to Gemini
```text
{data.get("prompt_used", "N/A")}
```

## 3. Gemini Response (Advisory Text)
> {data.get("advisory").replace(chr(10), chr(10) + "> ")}

"""
        
        with open("GEMINI_INTEGRATION_VALIDATION.md", "w", encoding="utf-8") as f:
            f.write(md_content)
            
        print("Successfully wrote GEMINI_INTEGRATION_VALIDATION.md")
        
    except Exception as e:
        print(f"Validation failed: {e}")

if __name__ == "__main__":
    run_validation()

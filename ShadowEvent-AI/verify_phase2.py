import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

tests = [
    ("health",     "http://localhost:8000/health"),
    ("seri",       "http://localhost:8000/seri?named_only=true&limit=3"),
    ("forecast",   "http://localhost:8000/forecast?named_only=true&limit=3"),
    ("mmi-config", "http://localhost:8000/mmi-config"),
    ("heatmap",    "http://localhost:8000/heatmap-data?layer=shadow"),
    ("methodology","http://localhost:8000/methodology"),
]
for label, url in tests:
    try:
        r = urllib.request.urlopen(url, timeout=5)
        d = json.loads(r.read())
        if label == "seri":
            top = d["data"][0] if d["data"] else {}
            print(f"OK /{label}: total={d['total']}, top_seri={top.get('seri','?')}, top_corridor={top.get('corridor','?')}")
        elif label == "forecast":
            meta = d.get("metadata", {})
            print(f"OK /{label}: total={d['total']}, mae={meta.get('validation_mae','?')}")
        elif label == "heatmap":
            print(f"OK /{label}: shadow centroids={len(d.get('points',[]))}")
        elif label == "mmi-config":
            print(f"OK /{label}: configured={d.get('configured')}, valid={d.get('valid')}")
        elif label == "methodology":
            print(f"OK /{label}: dataset_rows={d['dataset']['rows']}")
        else:
            print(f"OK /{label}: version={d.get('version','?')}, mmi={d.get('mmi_configured','?')}")
    except Exception as e:
        print(f"FAIL /{label}: {e}")

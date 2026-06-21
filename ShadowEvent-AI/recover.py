import json

transcript_path = r"C:\Users\priyali\.gemini\antigravity-ide\brain\96b2564e-60ae-4671-945a-192768288e5e\.system_generated\logs\transcript.jsonl"

with open(transcript_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in lines:
    try:
        step = json.loads(line)
        if "output" in step.get("content", "") and "LearningEngine.tsx" in step.get("content", ""):
            print("Found step with LearningEngine.tsx")
            with open("learning_engine_recovery.txt", "a", encoding="utf-8") as out:
                out.write(step["content"])
    except:
        pass

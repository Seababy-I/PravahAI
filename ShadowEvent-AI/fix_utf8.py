import os
import glob

replacements = {
    "Â·": "·",
    "â€“": "–",
    "â€”": "—",
    "ðŸ ™ï¸ ": "🏙️",
    "ðŸ‘ ï¸ ": "👁️",
    "ðŸ“…": "📅",
    "ðŸ§ª": "🧪",
    "ðŸ§ ": "🧠",
    "ðŸ—ºï¸ ": "🗺️",
    "ðŸ“–": "📖",
    "âš¡": "⚡",
    "ðŸ‘ ": "👻",
    "ðŸ”´": "🔴",
    "ðŸ›£": "🛣️",
    "âš ": "⚠️",
    "Ã—": "×",
    "â†’": "→",
    "âœ…": "✅",
    "âš™ï¸ ": "⚙️",
    "â† ": "←"
}

directory = r"d:\HACKATHON\Flipkart\Prototype - Theme 2\ShadowEvent-AI\frontend\src"

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith((".ts", ".tsx")):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements.items():
                new_content = new_content.replace(old, new)
                
            if new_content != content:
                print(f"Fixed {filepath}")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)

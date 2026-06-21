import os

filepath = r"d:\HACKATHON\Flipkart\Prototype - Theme 2\ShadowEvent-AI\frontend\src\pages\Methodology.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Emojis in SECTIONS
content = content.replace('icon:"ðŸ—„ï¸ "', 'icon:<Database size={16} />')
content = content.replace('icon:"âš™ï¸ "', 'icon:<Settings size={16} />')
content = content.replace('icon:"ðŸ‘ ï¸ "', 'icon:<Eye size={16} />')
content = content.replace('icon:"ðŸ“Š"', 'icon:<BarChart2 size={16} />')
content = content.replace('icon:"ðŸ“…"', 'icon:<Calendar size={16} />')
content = content.replace('icon:"ðŸ” "', 'icon:<Search size={16} />')
content = content.replace('icon:"ðŸ”¥"', 'icon:<Flame size={16} />')
content = content.replace('icon:"ðŸ§ "', 'icon:<Brain size={16} />')
content = content.replace('icon:"âš ï¸ "', 'icon:<AlertTriangle size={16} />')

# Section titles
content = content.replace('ðŸ—„ï¸  Dataset', '<Database size={20} /> Dataset')
content = content.replace('âš™ï¸  Data Pipeline', '<Settings size={20} /> Data Pipeline')
content = content.replace('ðŸ‘ ï¸  Shadow Events', '<Eye size={20} /> Shadow Events')
content = content.replace('ðŸ“Š SERI â€” Shadow Event Risk Index', '<BarChart2 size={20} /> SERI — Shadow Event Risk Index')
content = content.replace('ðŸ“… Forecast Methodology', '<Calendar size={20} /> Forecast Methodology')
content = content.replace('ðŸ”  KNN Similarity Engine', '<Search size={20} /> KNN Similarity Engine')
content = content.replace('ðŸ”¥ Hotspot Detection', '<Flame size={20} /> Hotspot Detection')
content = content.replace('ðŸ§  Adaptive Learning Engine', '<Brain size={20} /> Adaptive Learning Engine')
content = content.replace('âš ï¸  Assumptions & Limitations', '<AlertTriangle size={20} /> Assumptions & Limitations')

# Fix math / punctuation
content = content.replace('â†’', '→')
content = content.replace('â€”', '—')
content = content.replace('â€“', '–')
content = content.replace('Ã—', '×')
content = content.replace('Î£', 'Σ')
content = content.replace('âˆˆ', '∈')
content = content.replace('â‰¤', '≤')
content = content.replace('â‰¥', '≥')

# Add imports if not present
if "lucide-react" not in content:
    content = content.replace('import { useState } from "react";', 'import { useState } from "react";\nimport { Database, Settings, Eye, BarChart2, Calendar, Search, Flame, Brain, AlertTriangle } from "lucide-react";')

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed Methodology.tsx")

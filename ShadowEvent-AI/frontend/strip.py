import os
import re

for filename in os.listdir('src/pages'):
    if not filename.endswith('.tsx'): continue
    filepath = os.path.join('src/pages', filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # regex to strip PravahAI and the separator
    new_content = re.sub(r'<span className=\"page-title-brand\">PravahAI</span>\s*<span className=\"page-title-sep\">[^<]*</span>\s*', '', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

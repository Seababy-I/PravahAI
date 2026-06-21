import os
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

def find_encoding_issues(directory):
    # Regex to match common garbled utf-8 patterns (like â, ð, etc.) and emojis
    # â is \xc3\xa2, ð is \xc3\xb0 in latin1
    pattern = re.compile(r'[\U00010000-\U0010ffff]|â|ð|Ã|ï|¸||œ|÷|¥|©|®|™|×')
    
    issues = {}
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.css')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        for i, line in enumerate(lines):
                            if pattern.search(line):
                                if path not in issues:
                                    issues[path] = []
                                issues[path].append((i+1, line.strip()))
                except Exception as e:
                    pass
                    
    for path, lines in issues.items():
        print(f"\n--- {path} ---")
        for num, line in lines:
            print(f"{num}: {line}")

find_encoding_issues(r"d:\HACKATHON\Flipkart\Prototype - Theme 2\ShadowEvent-AI\frontend\src")

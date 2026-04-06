import os

file_path = r'c:\Users\basdu\Downloads\NCKHTA\ai-service\app\services\llm_service.py'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
fixed_count = 0
for i, line in enumerate(lines):
    # Skip empty lines or purely whitespace lines
    if not line.strip():
        new_lines.append(line)
        continue
    
    # We only care about lines inside parenthesized multi-line strings
    # which generally have indentation and start with a quote.
    stripped = line.strip()
    if len(stripped) >= 2 and (stripped.startswith("'") or stripped.startswith('"')):
        # Check if the string segment is unterminated or has mismatched quotes
        # But wait, lines like '"key": "value"\n' are actually single strings that start with '
        
        # A more robust check: does it start with ' and end with " ?
        if stripped.startswith("'") and stripped.endswith('"'):
             # Line starts with ' but ends with ". Common mistake after my script.
             # We should probably end it with '
             line = line.replace('"\n', "'\n")
             fixed_count += 1
        elif stripped.startswith('"') and stripped.endswith("'"):
             # Line starts with " but ends with '. Another possible mismatch.
             line = line.replace("'\n", '"\n')
             fixed_count += 1
             
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Repaired: {fixed_count} lines")

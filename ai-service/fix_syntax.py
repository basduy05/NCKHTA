import os

file_path = r'c:\Users\basdu\Downloads\NCKHTA\ai-service\app\services\llm_service.py'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
fixed_count = 0
for line in lines:
    original = line
    # If a line starts with whitespace and ends with \n\n"
    # we replace " with ' to close the single quote that started the string segment
    if '\\n\\n"' in line and line.rstrip().endswith('"'):
        line = line.replace('\\n\\n"', "\\n\\n'")
        fixed_count += 1
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Fixed: {fixed_count} lines")

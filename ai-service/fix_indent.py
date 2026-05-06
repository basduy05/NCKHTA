import sys

filepath = 'app/routers/student.py'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Adjust indices: line numbers 1126-1218 inclusive (1-based)
start_idx = 1126 - 1
end_idx = 1218 - 1

for i in range(start_idx, end_idx+1):
    line = lines[i]
    stripped = line.lstrip()
    # skip blank lines or lines that are only whitespace
    if not stripped.strip():
        continue
    spaces = len(line) - len(stripped)
    if spaces > 8:
        new_line = ' ' * (spaces - 1) + stripped
        lines[i] = new_line

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Adjusted indentation for lines {start_idx+1}-{end_idx+1}")

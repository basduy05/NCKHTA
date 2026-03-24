import os

filepath = r'app\dashboard\teacher\page.tsx'

if not os.path.exists(filepath):
    # Try absolute path if relative fails
    filepath = r'c:\Users\basdu\Downloads\NCKHTA\frontend\app\dashboard\teacher\page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
fix1_applied = False
fix2_applied = False

while i < len(lines):
    line = lines[i]
    
    # Check for Fix 1
    if not fix1_applied and "</div>" in line and i + 2 < len(lines):
        if ");" in lines[i+1] and "})}" in lines[i+2]:
            if line.strip() == "</div>" and lines[i+1].strip() == ");" and lines[i+2].strip() == "})}":
                new_lines.append(line)
                new_lines.append("                    </div>\n")
                new_lines.append(lines[i+1])
                new_lines.append(lines[i+2])
                i += 3
                fix1_applied = True
                print("Fix 1 applied")
                continue

    # Check for Fix 2
    if not fix2_applied and "</div>" in line and i + 4 < len(lines):
        if "</div>" in lines[i+1] and ")}" in lines[i+2] and "</div>" in lines[i+3] and ")}" in lines[i+4]:
             if line.strip() == "</div>" and lines[i+1].strip() == "</div>" and lines[i+2].strip() == ")}" and lines[i+3].strip() == "</div>" and lines[i+4].strip() == ")}":
                new_lines.append(line)
                new_lines.append("            )}\n")
                new_lines.append("          </div>\n")
                new_lines.append("        )}\n")
                i += 5
                fix2_applied = True
                print("Fix 2 applied")
                continue
                
    new_lines.append(line)
    i += 1

print(f"Status: Fix1={fix1_applied}, Fix2={fix2_applied}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

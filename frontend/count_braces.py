import sys

with open(r'c:\Users\basdu\Downloads\NCKHTA\frontend\app\dashboard\teacher\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    open_braces = content.count('{')
    close_braces = content.count('}')
    print(f"Open: {open_braces}")
    print(f"Close: {close_braces}")
    
    # Check for balancing in context of AIToolsTab
    lines = content.split('\n')
    tab_start = -1
    for i, line in enumerate(lines):
        if 'function AIToolsTab' in line:
            tab_start = i
            break
            
    if tab_start != -1:
        print(f"AIToolsTab starts at line {tab_start + 1}")
        # Count braces from there
        sub_content = '\n'.join(lines[tab_start:])
        sub_open = sub_content.count('{')
        sub_close = sub_content.count('}')
        print(f"Braces in AIToolsTab (approx): {sub_open} open, {sub_close} close")

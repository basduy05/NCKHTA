import ast
import os
import re

routers_dir = 'app/routers'
for filename in os.listdir(routers_dir):
    if not filename.endswith('.py'): continue
    filepath = os.path.join(routers_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        src = f.read()
    
    try:
        tree = ast.parse(src, filename=filename)
    except Exception as e:
        print(f"Error parsing {filename}: {e}")
        continue
        
    functions_to_change = []
    
    for node in tree.body:
        if isinstance(node, ast.AsyncFunctionDef):
            has_await = any(isinstance(n, (ast.Await, ast.AsyncWith, ast.AsyncFor)) for n in ast.walk(node))
            if not has_await:
                functions_to_change.append(node.name)
                
    if not functions_to_change:
        continue
        
    print(f"Modifying {filename}: {len(functions_to_change)} functions: {functions_to_change}")
    
    new_src = src
    for func in functions_to_change:
        # Regex to find: async def func_name(
        # Handles edge cases of decorators above it
        pattern = r'async\s+def\s+' + re.escape(func) + r'\s*\('
        new_src = re.sub(pattern, f'def {func}(', new_src)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_src)

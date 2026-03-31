import ast
import os

routers_dir = 'app/routers'
for filename in os.listdir(routers_dir):
    if not filename.endswith('.py'): continue
    filepath = os.path.join(routers_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        src = f.read()
    
    tree = ast.parse(src, filename=filename)
    for node in tree.body:
        if isinstance(node, ast.AsyncFunctionDef):
            # Check if this function has any await / async with / async for
            has_await = any(isinstance(n, (ast.Await, ast.AsyncWith, ast.AsyncFor)) for n in ast.walk(node))
            if not has_await:
                print(f"{filename}: {node.name}")

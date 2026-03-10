import sys

def patch_file(filepath, auth_func):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add Response if missing
    if 'from fastapi import Response' not in content and ' Response' not in content:
        content = content.replace('from fastapi import APIRouter', 'from fastapi import APIRouter, Response')

    if 'def get_grammar_rules' in content:
        print(f"Grammar already exists in {filepath}")
        return

    insertion = f'''

# ─── GRAMMAR ────────────────────────────────────────────────────────────────

@router.get("/grammar")
def get_grammar_rules(authorization: str = Header(...)):
    {auth_func}(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT id, name, description, file_name, created_at FROM grammar_rules ORDER BY id DESC")
    columns = [column[0] for column in cursor.description]
    results = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return results

@router.get("/grammar/{{rule_id}}/file")
def get_grammar_file(rule_id: int):
    conn = get_db()
    cursor = conn.execute("SELECT file_name, file_data FROM grammar_rules WHERE id = ?", (rule_id,))
    row = cursor.fetchone()
    conn.close()
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_name = row[0]
    file_data = row[1]
    
    import mimetypes
    media_type, _ = mimetypes.guess_type(file_name)
    if not media_type:
        media_type = "application/octet-stream"
        
    return Response(content=file_data, media_type=media_type, headers={{
        "Content-Disposition": f\'inline; filename="{{file_name}}"\'
    }})
'''
    content += insertion
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Patched {filepath}")

patch_file('app/routers/student.py', '_get_current_student')
patch_file('app/routers/teacher.py', '_get_current_teacher')


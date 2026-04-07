
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.responses import Response
from ..database import get_db, UserCreate, ClassCreate, LessonCreate, get_all_settings, set_setting, get_setting
from ..services import graph_service, llm_service, auth_service
import sqlite3
import csv
import io
import base64
import asyncio
import time
import cohere
import google.generativeai as genai
from pydantic import BaseModel
from typing import Dict, Optional, List

class BulkCreditUpdate(BaseModel):
    credits: int
    role: str = "STUDENT"

class GrammarAIGen(BaseModel):
    topic: str

router = APIRouter(prefix="/admin", tags=["Admin"])

_AI_STATS_CACHE = {"data": None, "expires_at": 0.0}
_AI_STATS_CACHE_TTL_SECONDS = 15

class BulkCreditUpdate(BaseModel):
    credits: int
    role: str = "STUDENT"

@router.get("/health-public")
def admin_health_public():
    """Unauthenticated health check for Admin router."""
    print("[ADMIN DEBUG] Public health check hit", flush=True)
    return {"status": "ok", "message": "Admin router is reachable"}

@router.get("/health-db")
def admin_health_db():
    """Check DB connectivity from Admin router."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        conn.close()
        return {"status": "ok", "user_count": count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stats")
async def get_admin_stats():
    print("[ADMIN DEBUG] get_admin_stats called", flush=True)
    conn = get_db()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM users")
        users_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM classes")
        classes_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM lessons")
        lessons_count = cursor.fetchone()[0]
        conn.close()

        vocab_count = 0
        try:
            # Wrap blocking Neo4j call in a thread to avoid blocking the event loop
            def _query_neo4j():
                g = graph_service.get_graph()
                if g:
                    res = g.query("MATCH (n) RETURN count(n) as count LIMIT 1")
                    if res and len(res) > 0:
                        return res[0]["count"]
                return 0
            vocab_count = await asyncio.to_thread(_query_neo4j)
        except Exception as e:
            print(f"[ADMIN STATS] Neo4j Error: {e}")

        return {
            "users": users_count,
            "vocab": vocab_count,
            "classes": classes_count,
            "lessons": lessons_count
        }
    except Exception as e:
        if conn:
            try: conn.close()
            except: pass
        print(f"[ADMIN STATS ERROR] {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Admin stats retrieval error: {str(e)}")

# --- AI MONITORING ---

@router.get("/ai-logs")
def get_ai_logs(limit: int = 100, offset: int = 0, include_response_content: bool = False):
    """Retrieve detailed AI execution logs."""
    # Bound expensive scans and large payloads.
    limit = max(1, min(limit, 200))
    offset = max(0, offset)

    conn = get_db()
    try:
        content_col = ", response_content" if include_response_content else ""
        cursor = conn.execute("""
            SELECT id, user_id, endpoint, model, difficulty, latency_ms, status, error_message, feature, eval_score, eval_feedback, created_at
            FROM ai_logs
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """.replace("eval_feedback, created_at", f"eval_feedback{content_col}, created_at"), (limit, offset))
        logs = [dict(row) for row in cursor.fetchall()]
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM ai_logs")
        total = cursor.fetchone()[0]
        
        conn.close()
        return {"logs": logs, "total": total}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai-stats")
def get_ai_stats():
    """Aggregate statistics for AI model performance."""
    now = time.time()
    if _AI_STATS_CACHE["data"] is not None and now < _AI_STATS_CACHE["expires_at"]:
        return _AI_STATS_CACHE["data"]

    conn = get_db()
    try:
        cursor = conn.cursor()
        
        # Average latency by model and difficulty
        cursor.execute("""
            SELECT model, difficulty, feature,
                   AVG(latency_ms) as avg_latency, 
                   COUNT(*) as total_requests,
                   AVG(eval_score) as avg_score,
                   SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count
            FROM ai_logs
            GROUP BY model, difficulty, feature
        """)
        model_stats = [dict(row) for row in cursor.fetchall()]
        
        # New: Stats grouped specifically by feature for the dashboard
        cursor.execute("""
            SELECT feature,
                   AVG(latency_ms) as avg_latency, 
                   COUNT(*) as total_requests,
                   AVG(eval_score) as avg_score,
                   SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
                   MAX(latency_ms) as max_latency
            FROM ai_logs
            GROUP BY feature
            ORDER BY total_requests DESC
        """)
        feature_stats = [dict(row) for row in cursor.fetchall()]
        
        # Success/Error over time (last 7 days)
        cursor.execute("""
            SELECT date(created_at) as date, 
                   COUNT(*) as requests,
                   SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count
            FROM ai_logs
            WHERE created_at >= date('now', '-7 days')
            GROUP BY date(created_at)
            ORDER BY date ASC
        """)
        stats_over_time = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        payload = {
            "model_performance": model_stats,
            "feature_performance": feature_stats,
            "success_over_time": stats_over_time
        }
        _AI_STATS_CACHE["data"] = payload
        _AI_STATS_CACHE["expires_at"] = now + _AI_STATS_CACHE_TTL_SECONDS
        return payload
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

# --- USERS CRUD ---

@router.get("/users")
def get_users():
    conn = get_db()
    try:
        cursor = conn.execute("SELECT id, name, email, role, credits_ai, points FROM users ORDER BY id DESC")
        users = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return users
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users")
def create_user(user: UserCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # If admin doesn't provide a password, generate a default one like '123456'
        raw_password = user.password if user.password else "123456"
        hashed_password = auth_service.get_password_hash(raw_password)
        credits = getattr(user, 'credits_ai', 50)
        
        cursor.execute(
            "INSERT INTO users (name, email, role, is_active, password_hash, is_verified, credits_ai) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user.name, user.email, user.role.upper(), 1, hashed_password, 1, credits)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already exists")   
    except sqlite3.OperationalError:
        try:
             # Fallback for old schema
             cursor.execute("INSERT INTO users (name, email, role) VALUES (?, ?, ?)", (user.name, user.email, user.role.upper()))
             conn.commit()
        except Exception as e:
             conn.close()
             raise HTTPException(status_code=500, detail="Database schema mismatch")

    conn.close()
    return {"message": "User created successfully"}

@router.put("/users/{user_id}")
def update_user(user_id: int, user_data: dict):
    conn = get_db()
    # Build dynamic update query
    fields = []
    values = []
    for k, v in user_data.items():
        if k in ["name", "email", "role", "credits_ai", "points"]:
            fields.append(f"{k} = ?")
            values.append(v.upper() if k == "role" else v)
    
    if not fields:
        conn.close()
        return {"message": "No fields to update"}
        
    values.append(user_id)
    try:
        cursor = conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", tuple(values))
        conn.commit()
        print(f"[ADMIN] User {user_id} updated. Rows affected: {cursor.rowcount}", flush=True)
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already exists")
    conn.close()
    return {"message": "User updated successfully"}

@router.post("/bulk-update-credits")
def bulk_update_credits(data: BulkCreditUpdate):
    conn = get_db()
    try:
        cursor = conn.execute("UPDATE users SET credits_ai = ? WHERE role = ?", (data.credits, data.role.upper()))
        conn.commit()
        print(f"[ADMIN] Bulk credit update for {data.role} to {data.credits}. Rows affected: {cursor.rowcount}", flush=True)
        conn.close()
        return {"message": f"Updated credits for all {data.role}s to {data.credits}"}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/users/{user_id}")
def delete_user(user_id: int):
    conn = get_db()
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "User deleted"}


# --- CLASSES CRUD ---

@router.get("/classes")
def get_classes():
    conn = get_db()
    cursor = conn.execute("SELECT id, name, teacher_name, students_count FROM classes ORDER BY id DESC")
    classes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return classes

@router.post("/classes")
def create_class(cls: ClassCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO classes (name, teacher_name, students_count) VALUES (?, ?, ?)",
                   (cls.name, cls.teacher_name, cls.students_count))
    conn.commit()
    conn.close()
    return {"message": "Class created successfully"}

@router.put("/classes/{class_id}")
def update_class(class_id: int, cls: ClassCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE classes SET name = ?, teacher_name = ?, students_count = ? WHERE id = ?",
                   (cls.name, cls.teacher_name, cls.students_count, class_id))
    conn.commit()
    conn.close()
    return {"message": "Class updated successfully"}

@router.delete("/classes/{class_id}")
def delete_class(class_id: int):
    conn = get_db()
    try:
        conn.execute("DELETE FROM classes WHERE id = ?", (class_id,))
        conn.commit()
        conn.close()
        return {"message": "Class deleted"}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

# --- LESSONS CRUD ---

@router.get("/lessons")
def get_lessons():
    conn = get_db()
    try:
        cursor = conn.execute("SELECT lessons.id, lessons.class_id, lessons.title, lessons.content, lessons.file_name, classes.name as class_name FROM lessons JOIN classes ON lessons.class_id = classes.id ORDER BY lessons.id DESC")
        lessons = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return lessons
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/lessons")
async def create_lesson(
    class_id: int = Form(...),
    title: str = Form(...),
    content: str = Form(""),
    file: Optional[UploadFile] = File(None)
):
    conn = get_db()
    cursor = conn.cursor()
    file_name = None
    file_data = None
    if file and file.filename:
        if hasattr(file, 'size') and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
        file_name = file.filename
        file_data = await file.read()
    cursor.execute("INSERT INTO lessons (class_id, title, content, file_name, file_data) VALUES (?, ?, ?, ?, ?)",
                   (class_id, title, content, file_name, file_data))
    conn.commit()
    conn.close()
    return {"message": "Lesson created successfully"}

@router.get("/lessons/{lesson_id}/file")
def get_lesson_file(lesson_id: int):
    conn = get_db()
    cursor = conn.execute("SELECT file_name, file_data FROM lessons WHERE id = ?", (lesson_id,))
    row = cursor.fetchone()
    conn.close()
    if not row or not row['file_data']:
        raise HTTPException(status_code=404, detail="No file attached")
    return Response(content=row['file_data'], media_type="application/octet-stream",
                    headers={"Content-Disposition": f"attachment; filename=\"{row['file_name']}\""})

@router.delete("/lessons/{lesson_id}")
def delete_lesson(lesson_id: int):
    conn = get_db()
    try:
        conn.execute("DELETE FROM lessons WHERE id = ?", (lesson_id,))
        conn.commit()
        conn.close()
        return {"message": "Lesson deleted"}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/lessons/{lesson_id}")
async def update_lesson(
    lesson_id: int,
    class_id: int = Form(...),
    title: str = Form(...),
    content: str = Form(""),
    file: Optional[UploadFile] = File(None)
):
    conn = get_db()
    cursor = conn.cursor()
    if file and file.filename:
        if hasattr(file, 'size') and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
        file_name = file.filename
        file_data = await file.read()
        cursor.execute("UPDATE lessons SET class_id=?, title=?, content=?, file_name=?, file_data=? WHERE id=?",
                       (class_id, title, content, file_name, file_data, lesson_id))
    else:
        cursor.execute("UPDATE lessons SET class_id=?, title=?, content=? WHERE id=?",
                       (class_id, title, content, lesson_id))
    conn.commit()
    conn.close()
    return {"message": "Lesson updated"}

@router.post("/vocab/import")
async def import_vocab(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    if hasattr(file, 'size') and file.size > 5 * 1024 * 1024:  # 5MB for CSV
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")

    content = await file.read()
    try:
        text = content.decode('utf-8-sig') # Handle BOM if present
    except UnicodeDecodeError:
        text = content.decode('latin-1')
        
    reader = csv.DictReader(io.StringIO(text))
    
    count = 0
    errors = []
    
    try:
        for row in reader:
            try:
                word = (row.get('word') or '').strip()
                if not word: continue
                
                pronunciation = (row.get('pronunciation') or '').strip()
                meaning = (row.get('meaning') or '').strip()
                level = (row.get('level') or 'A1').strip()
                if not level: level = 'A1'
                word_type = (row.get('type') or 'noun').strip()
                if not word_type: word_type = 'noun'
                example = (row.get('example') or '').strip()
                
                if not example:
                    try:
                        example = llm_service.generate_example_sentence(word, meaning, level)
                    except Exception as e:
                        print(f"LLM Error generating example for {word}: {e}")
                        example = f"Example for {word}"

                data = {
                    "word": word,
                    "pronunciation": pronunciation,
                    "meaning": meaning,
                    "level": level,
                    "type": word_type,
                    "example": example
                }
                
                res = graph_service.create_vocab_node(data)
                if res.get("status") == "success":
                    count += 1
                else:
                    errors.append(f"Failed to add {word}: {res.get('message')}")
            except Exception as e:
                 errors.append(f"Error processing row: {str(e)}")
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {e}")
    except Exception as e:
        # Catch unexpected errors during iteration
        if not errors and count == 0:
             raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")
        else:
             errors.append(f"Processing interrupted: {str(e)}")
            
    return {"message": f"Successfully imported {count} words.", "errors": errors}

# --- VOCAB LIST (from Neo4j) ---

@router.get("/vocab/list")
def list_vocab(level: str = "", limit: int = 50, skip: int = 0, search: str = ""):
    """List vocabulary words stored in Neo4j with pagination."""
    g = graph_service.get_graph()
    if not g:
        return {"words": [], "total": 0, "error": "Graph DB not connected"}
    try:
        # Count total
        if level:
            count_q = "MATCH (w:Word {level: $level}) RETURN count(w) as total"
            count_res = g.query(count_q, params={"level": level})
        elif search:
            count_q = "MATCH (w:Word) WHERE toLower(w.text) CONTAINS toLower($search) OR toLower(w.meaning_vn) CONTAINS toLower($search) RETURN count(w) as total"
            count_res = g.query(count_q, params={"search": search})
        else:
            count_q = "MATCH (w:Word) RETURN count(w) as total"
            count_res = g.query(count_q)
        total = count_res[0]["total"] if count_res else 0

        # Fetch page
        if level:
            query = "MATCH (w:Word {level: $level}) RETURN w ORDER BY w.text SKIP $skip LIMIT $limit"
            results = g.query(query, params={"level": level, "skip": skip, "limit": limit})
        elif search:
            query = "MATCH (w:Word) WHERE toLower(w.text) CONTAINS toLower($search) OR toLower(w.meaning_vn) CONTAINS toLower($search) RETURN w ORDER BY w.text SKIP $skip LIMIT $limit"
            results = g.query(query, params={"search": search, "skip": skip, "limit": limit})
        else:
            query = "MATCH (w:Word) RETURN w ORDER BY w.text SKIP $skip LIMIT $limit"
            results = g.query(query, params={"skip": skip, "limit": limit})
        words = []
        for r in results:
            w = r.get("w", {})
            words.append({
                "word": w.get("text", ""),
                "pronunciation": w.get("pronunciation", ""),
                "meaning": w.get("meaning_vn", ""),
                "level": w.get("level", ""),
                "type": w.get("type", ""),
                "example": w.get("example", ""),
            })
        return {"words": words, "total": total}
    except Exception as e:
        return {"words": [], "total": 0, "error": str(e)}

class VocabUpdate(BaseModel):
    word: str
    pronunciation: str = ""
    meaning: str = ""
    level: str = "A1"
    type: str = "noun"
    example: str = ""

@router.post("/vocab")
def create_single_vocab(data: VocabUpdate):
    """Create a single vocabulary word in Neo4j."""
    res = graph_service.create_vocab_node({
        "word": data.word, "pronunciation": data.pronunciation,
        "meaning": data.meaning, "level": data.level,
        "type": data.type, "example": data.example
    })
    if res.get("status") == "success":
        return {"message": f"Created '{data.word}'"}
    raise HTTPException(status_code=500, detail=res.get("message", "Failed"))

@router.put("/vocab/{word}")
def update_vocab(word: str, data: VocabUpdate):
    """Update an existing vocabulary word in Neo4j."""
    g = graph_service.get_graph()
    if not g:
        raise HTTPException(status_code=500, detail="Graph DB not connected")
    try:
        query = """
        MATCH (w:Word {text: $old_word})
        SET w.text = $word, w.pronunciation = $pronunciation,
            w.meaning_vn = $meaning, w.level = $level,
            w.type = $type, w.example = $example
        RETURN w
        """
        result = g.query(query, params={
            "old_word": word, "word": data.word,
            "pronunciation": data.pronunciation, "meaning": data.meaning,
            "level": data.level, "type": data.type, "example": data.example
        })
        if not result:
            raise HTTPException(status_code=404, detail=f"Word '{word}' not found")
        return {"message": f"Updated '{word}'"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/vocab/{word}")
def delete_vocab(word: str):
    # 1. Clear from Neo4j (Global storage)
    g = graph_service.get_graph()
    if not g:
        raise HTTPException(status_code=500, detail="Graph DB not connected")
    try:
        # DETACH DELETE removes the node and all its relationships
        g.query("MATCH (w:Word) WHERE toLower(w.text) = toLower($word) DETACH DELETE w", params={"word": word})
        
        # 2. Clear from SQLite (Local Cache, Student Lists, and Logs)
        conn = get_db()
        try:
            cursor = conn.cursor()
            word_lower = word.lower()
            
            # Delete study logs first (foreign key dependency)
            cursor.execute("""
                DELETE FROM study_logs 
                WHERE word_id IN (SELECT id FROM saved_vocabulary WHERE toLower(word) = ?)
            """, (word_lower,))
            
            # Delete from student's saved lists
            cursor.execute("DELETE FROM saved_vocabulary WHERE toLower(word) = ?", (word_lower,))
            
            # Delete from dictionary cache
            cursor.execute("DELETE FROM dictionary_cache WHERE toLower(word) = ?", (word_lower,))
            
            conn.commit()
            print(f"[ADMIN VOCAB] Deleted '{word}' completely from Neo4j and SQLite.", flush=True)
            conn.close()
        except Exception as sqlite_err:
            if conn: conn.close()
            print(f"[ADMIN VOCAB DELETE ERROR] SQLite: {sqlite_err}")
            # Continue anyway as Neo4j might have succeeded
            
        return {"message": f"Deleted '{word}' completely from the system."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- GRAMMAR RULES CRUD ---

@router.post("/grammar/ai-generate")
async def ai_generate_grammar_rule(data: GrammarAIGen):
    """Generate a grammar rule name and description using AI."""
    try:
        topic = data.topic
        result = await llm_service.generate_grammar_rule_description(topic)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

@router.get("/grammar")
def get_grammar_rules():
    conn = get_db()
    cursor = conn.execute("SELECT id, name, description, file_name, created_at FROM grammar_rules ORDER BY id DESC")
    rules = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rules

@router.post("/grammar")
async def create_grammar_rule(
    name: str = Form(...),
    description: str = Form(""),
    file: Optional[UploadFile] = File(None)
):
    conn = get_db()
    cursor = conn.cursor()
    file_name = None
    file_data = None
    if file and file.filename:
        if hasattr(file, 'size') and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
        file_name = file.filename
        file_data = await file.read()
    cursor.execute("INSERT INTO grammar_rules (name, description, file_name, file_data) VALUES (?, ?, ?, ?)",
                   (name, description, file_name, file_data))
    conn.commit()
    conn.close()
    
    # Sync to Neo4j
    try:
        from ..services import graph_service
        graph_service.save_grammar_to_graph(name, description)
    except Exception as e:
        print(f"Grammar sync error: {e}")
        
    return {"message": "Grammar rule created"}

@router.get("/grammar/{rule_id}/file")
def get_grammar_file(rule_id: int):
    conn = get_db()
    cursor = conn.execute("SELECT file_name, file_data FROM grammar_rules WHERE id = ?", (rule_id,))
    row = cursor.fetchone()
    conn.close()
    if not row or not row['file_data']:
        raise HTTPException(status_code=404, detail="No file attached")
    return Response(content=row['file_data'], media_type="application/octet-stream",
                    headers={"Content-Disposition": f"attachment; filename=\"{row['file_name']}\""})

@router.delete("/grammar/{rule_id}")
def delete_grammar_rule(rule_id: int):
    conn = get_db()
    # Get name for Neo4j
    cursor = conn.execute("SELECT name FROM grammar_rules WHERE id = ?", (rule_id,))
    row = cursor.fetchone()
    name = row['name'] if row else None
    
    conn.execute("DELETE FROM grammar_rules WHERE id = ?", (rule_id,))
    conn.commit()
    conn.close()
    
    if name:
        try:
            from ..services import graph_service
            graph_service.delete_grammar_from_graph(name)
        except Exception as e:
            print(f"Grammar delete sync error: {e}")
            
    return {"message": "Grammar rule deleted"}

@router.put("/grammar/{rule_id}")
async def update_grammar_rule(
    rule_id: int,
    name: str = Form(...),
    description: str = Form(""),
    file: Optional[UploadFile] = File(None)
):
    conn = get_db()
    cursor = conn.cursor()
    if file and file.filename:
        if hasattr(file, 'size') and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
        file_name = file.filename
        file_data = await file.read()
        cursor.execute("UPDATE grammar_rules SET name=?, description=?, file_name=?, file_data=? WHERE id=?",
                       (name, description, file_name, file_data, rule_id))
    else:
        cursor.execute("UPDATE grammar_rules SET name=?, description=? WHERE id=?",
                       (name, description, rule_id))
    conn.commit()
    conn.close()
    
    # Sync to Neo4j
    try:
        from ..services import graph_service
        graph_service.save_grammar_to_graph(name, description)
    except Exception as e:
        print(f"Grammar update sync error: {e}")
        
    return {"message": "Grammar rule updated"}


# --- SETTINGS ---

SENSITIVE_KEYS = {"GOOGLE_API_KEY", "OPENAI_API_KEY", "COHERE_API_KEY", "NEO4J_PASSWORD", "SMTP_PASSWORD", "RESEND_API_KEY", "BREVO_API_KEY"}

def _mask(value: str) -> str:
    if not value or len(value) < 8:
        return "****" if value else ""
    return value[:4] + "*" * (len(value) - 8) + value[-4:]

@router.get("/settings")
def get_settings():
    """Return all settings. Sensitive values are masked."""
    raw = get_all_settings()
    masked = {}
    for k, v in raw.items():
        masked[k] = _mask(v) if k in SENSITIVE_KEYS and v else v
    return masked

class SettingsUpdate(BaseModel):
    settings: Dict[str, str]

@router.put("/settings")
def update_settings(data: SettingsUpdate):
    """Update settings. Skips values that look masked (contain ****)."""
    updated = []
    for key, value in data.settings.items():
        # Skip masked values (admin didn't change them)
        if "****" in value:
            continue
        set_setting(key, value)
        updated.append(key)

    # Reconnect Neo4j if any Neo4j setting changed
    neo4j_keys = {"NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD", "NEO4J_DATABASE"}
    if neo4j_keys & set(updated):
        try:
            g = graph_service.reconnect_graph()
            neo4j_status = "connected" if g else "failed"
        except Exception as e:
            neo4j_status = f"error: {e}"
    else:
        neo4j_status = "unchanged"

    return {"message": f"Updated {len(updated)} settings.", "updated_keys": updated, "neo4j_status": neo4j_status}

@router.post("/settings/test-email")
def test_email():
    """Send a test email using the configured provider (uses httpx for reliable HTTP)."""
    import httpx

    # auth_service._get_setting is an alias for get_setting from database.py
    provider = (auth_service._get_setting("EMAIL_PROVIDER") or "auto").lower().strip()
    sender = auth_service._get_setting("SENDER_EMAIL") or auth_service._get_setting("SMTP_USERNAME")
    test_recipient = auth_service._get_setting("SMTP_USERNAME") or sender

    steps = [f"Provider: {provider}", f"Sender: {sender}", f"Recipient: {test_recipient}"]

    if not sender:
        return {"success": False, "steps": steps, "error": "SENDER_EMAIL not configured"}

    # Try Brevo
    if provider in ("brevo", "auto"):
        brevo_key = auth_service._get_setting("BREVO_API_KEY")
        if brevo_key:
            try:
                resp = httpx.post(
                    "https://api.brevo.com/v3/smtp/email",
                    json={
                        "sender": {"name": "EAM System", "email": sender},
                        "to": [{"email": test_recipient}],
                        "subject": "EAM Test Email",
                        "htmlContent": "<h2>Test email from EAM</h2><p>Brevo is working! ✅</p>"
                    },
                    headers={"api-key": brevo_key, "User-Agent": "EAM/1.0"},
                    timeout=15,
                )
                resp.raise_for_status()
                steps.append(f"Brevo OK: {resp.json()}")
                return {"success": True, "steps": steps, "message": f"Email sent via Brevo to {test_recipient}"}
            except httpx.HTTPStatusError as e:
                steps.append(f"Brevo HTTP {e.response.status_code}: {e.response.text}")
            except Exception as e:
                steps.append(f"Brevo error: {type(e).__name__}: {e}")
        else:
            steps.append("BREVO_API_KEY not set")

    # Try Resend
    if provider in ("resend", "auto"):
        resend_key = auth_service._get_setting("RESEND_API_KEY")
        if resend_key:
            try:
                resp = httpx.post(
                    "https://api.resend.com/emails",
                    json={
                        "from": f"EAM System <{sender}>",
                        "to": [test_recipient],
                        "subject": "EAM Test Email",
                        "html": "<h2>Test email from EAM</h2><p>Resend is working! ✅</p>"
                    },
                    headers={"Authorization": f"Bearer {resend_key}", "User-Agent": "EAM/1.0"},
                    timeout=15,
                )
                resp.raise_for_status()
                steps.append(f"Resend OK: {resp.json()}")
                return {"success": True, "steps": steps, "message": f"Email sent via Resend to {test_recipient}"}
            except httpx.HTTPStatusError as e:
                steps.append(f"Resend HTTP {e.response.status_code}: {e.response.text}")
            except Exception as e:
                steps.append(f"Resend error: {type(e).__name__}: {e}")
        else:
            steps.append("RESEND_API_KEY not set")

    # Try SMTP
    if provider in ("smtp", "auto"):
        result = auth_service._send_via_smtp(test_recipient, "EAM Test Email", "<h2>Test</h2><p>SMTP working!</p>")
        if result:
            steps.append("SMTP send OK")
            return {"success": True, "steps": steps, "message": f"Email sent via SMTP to {test_recipient}"}
        else:
            steps.append("SMTP failed (ports 587/465 likely blocked on Render free tier)")

    return {"success": False, "steps": steps, "error": "All providers failed. See steps for details."}

@router.post("/settings/test-neo4j")
def test_neo4j():
    """Force reconnect and test Neo4j."""
    try:
        g = graph_service.reconnect_graph()
        if g:
            return {"message": "Neo4j connected successfully!"}
        err = getattr(graph_service, "last_error", "Unknown error")
        raise HTTPException(status_code=500, detail=f"Neo4j connection failed: {err}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/settings/gemini-models")
def list_gemini_models():
    """List Gemini models that support generateContent using the configured API key."""
    api_key = get_setting("GOOGLE_API_KEY") or auth_service._get_setting("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="GOOGLE_API_KEY is not configured")

    try:
        genai.configure(api_key=api_key)
        models = []
        lines = ["Cac model kha dung:"]

        for model in genai.list_models():
            methods = getattr(model, "supported_generation_methods", []) or []
            if "generateContent" not in methods:
                continue

            item = {
                "name": getattr(model, "name", ""),
                "description": getattr(model, "description", "") or "",
            }
            models.append(item)
            lines.append(f"- Ten: {item['name']}")
            lines.append(f"  Mo ta: {item['description']}")
            lines.append("")

        if not models:
            lines.append("Khong tim thay model nao ho tro generateContent.")

        return {
            "count": len(models),
            "models": models,
            "formatted_output": "\n".join(lines).strip(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list Gemini models: {e}")

@router.post("/settings/cohere-models")
def list_cohere_models():
    """List Cohere models using the configured API key."""
    api_key = get_setting("COHERE_API_KEY") or auth_service._get_setting("COHERE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="COHERE_API_KEY is not configured")

    try:
        client = cohere.Client(api_key)
        response = client.models.list(page_size=100)
        models = []
        lines = ["Cac model Cohere kha dung:"]

        for model in getattr(response, "models", []) or []:
            item = {
                "name": getattr(model, "name", "") or "",
                "endpoints": list(getattr(model, "endpoints", []) or []),
                "default_endpoints": list(getattr(model, "default_endpoints", []) or []),
                "features": list(getattr(model, "features", []) or []),
                "context_length": getattr(model, "context_length", None),
                "is_deprecated": bool(getattr(model, "is_deprecated", False)),
            }
            models.append(item)
            lines.append(f"- Ten: {item['name']}")
            lines.append(f"  Endpoints: {', '.join(item['endpoints']) if item['endpoints'] else 'N/A'}")
            lines.append(f"  Default endpoints: {', '.join(item['default_endpoints']) if item['default_endpoints'] else 'N/A'}")
            lines.append(f"  Features: {', '.join(item['features']) if item['features'] else 'N/A'}")
            lines.append(f"  Context length: {item['context_length'] if item['context_length'] is not None else 'N/A'}")
            lines.append(f"  Deprecated: {'yes' if item['is_deprecated'] else 'no'}")
            lines.append("")

        if not models:
            lines.append("Khong tim thay model Cohere nao.")

        return {
            "count": len(models),
            "models": models,
            "formatted_output": "\n".join(lines).strip(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list Cohere models: {e}")

# --- ASSIGNMENTS (TESTS & EXERCISES) CRUD ---

class AdminAssignmentCreate(BaseModel):
    class_id: int
    title: str
    description: str = ""
    type: str = "quiz"
    quiz_data: str = ""
    due_date: str = "2099-12-31"
    skill_type: Optional[str] = None
    bloom_level: Optional[int] = None

@router.get("/assignments")
def get_admin_assignments():
    conn = get_db()
    try:
        cursor = conn.execute("""
            SELECT a.id, a.class_id, a.title, a.description, a.type, a.due_date, a.created_at, a.skill_type, a.bloom_level,
                   c.name as class_name
            FROM assignments a
            JOIN classes c ON a.class_id = c.id
            ORDER BY a.id DESC
        """)
        assignments = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return assignments
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assignments")
def admin_create_assignment(data: AdminAssignmentCreate):
    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO assignments (class_id, teacher_id, title, description, type, quiz_data, due_date, skill_type, bloom_level) 
               VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)""",
            (data.class_id, data.title, data.description, data.type, data.quiz_data, data.due_date, data.skill_type, data.bloom_level)
        )
        conn.commit()
        conn.close()
        return {"message": "Assignment created successfully"}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/assignments/{assignment_id}")
def admin_delete_assignment(assignment_id: int):
    conn = get_db()
    try:
        conn.execute("DELETE FROM assignments WHERE id = ?", (assignment_id,))
        conn.commit()
        conn.close()
        return {"message": "Assignment deleted"}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))


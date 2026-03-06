
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from ..database import get_db, UserCreate, ClassCreate, LessonCreate, get_all_settings, set_setting
from ..services import graph_service, llm_service, auth_service
import sqlite3
import csv
import io
from pydantic import BaseModel
from typing import Dict

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/stats")
def get_admin_stats():
    conn = get_db()
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
        g = graph_service.get_graph()
        if g:
            res = g.query("MATCH (n) RETURN count(n) as count LIMIT 1")
            if res and len(res) > 0:
                vocab_count = res[0]["count"]
    except Exception as e:
        print("Neo4j Error:", e)

    return {
        "users": users_count,
        "vocab": vocab_count,
        "classes": classes_count,
        "lessons": lessons_count
    }

# --- USERS CRUD ---

@router.get("/users")
def get_users():
    conn = get_db()
    cursor = conn.execute("SELECT id, name, email, role FROM users ORDER BY id DESC")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return users

@router.post("/users")
def create_user(user: UserCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # If admin doesn't provide a password, generate a default one like '123456'
        raw_password = user.password if user.password else "123456"
        hashed_password = auth_service.get_password_hash(raw_password)
        
        cursor.execute(
            "INSERT INTO users (name, email, role, is_active, password_hash, is_verified) VALUES (?, ?, ?, ?, ?, ?)",
            (user.name, user.email, user.role.upper(), 1, hashed_password, 1)
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
def update_user(user_id: int, user: UserCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?", (user.name, user.email, user.role, user_id))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already exists")
    conn.close()
    return {"message": "User updated successfully"}

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
    conn.execute("DELETE FROM classes WHERE id = ?", (class_id,))
    conn.commit()
    conn.close()
    return {"message": "Class deleted"}

# --- LESSONS CRUD ---

@router.get("/lessons")
def get_lessons():
    conn = get_db()
    cursor = conn.execute("SELECT lessons.id, lessons.title, lessons.content, classes.name as class_name FROM lessons JOIN classes ON lessons.class_id = classes.id ORDER BY lessons.id DESC")
    lessons = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return lessons

@router.post("/lessons")
def create_lesson(lesson: LessonCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO lessons (class_id, title, content) VALUES (?, ?, ?)",
                   (lesson.class_id, lesson.title, lesson.content))
    conn.commit()
    conn.close()
    return {"message": "Lesson created successfully"}

@router.delete("/lessons/{lesson_id}")
def delete_lesson(lesson_id: int):
    conn = get_db()
    conn.execute("DELETE FROM lessons WHERE id = ?", (lesson_id,))
    conn.commit()
    conn.close()
    return {"message": "Lesson deleted"}

@router.post("/vocab/import")
async def import_vocab(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

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


# --- SETTINGS ---

SENSITIVE_KEYS = {"GOOGLE_API_KEY", "OPENAI_API_KEY", "NEO4J_PASSWORD", "SMTP_PASSWORD"}

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
    """Send a test email to SENDER_EMAIL."""
    sender = auth_service._get_setting("SENDER_EMAIL") or auth_service._get_setting("SMTP_USERNAME")
    if not sender:
        raise HTTPException(status_code=400, detail="SENDER_EMAIL / SMTP_USERNAME not configured.")
    ok = auth_service.send_email(sender, "EAM Test Email", "<h2>Test email from EAM System</h2><p>If you see this, SMTP is working correctly!</p>")
    if ok:
        return {"message": f"Test email sent to {sender}"}
    raise HTTPException(status_code=500, detail="Failed to send test email. Check SMTP settings and Render logs.")

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


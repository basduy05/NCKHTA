import sqlite3
import os
import traceback
from pydantic import BaseModel
from typing import List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")
MIN_MEANINGS_COUNT = 3  # Minimum meanings required before skipping AI lookup

def init_db():
    print(f"[DB] Initializing database at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    # Enable WAL mode for concurrent reads (prevents lock when multiple users)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")  # Wait 5s instead of failing immediately
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL
        )
    """)
    
    # --- MIGRATION FOR AUTHENTICATION ---
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    except sqlite3.OperationalError: pass
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN otp TEXT")
    except sqlite3.OperationalError: pass
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0")
    except sqlite3.OperationalError: pass
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
    except sqlite3.OperationalError: pass
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN password_reset_token TEXT")
    except sqlite3.OperationalError: pass
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN password_reset_expires INTEGER")
    except sqlite3.OperationalError: pass

    # --- MIGRATION: SET DEFAULT PASSWORDS FOR SEEDED USERS IF MISSING ---
    try:
        cursor.execute("SELECT id FROM users WHERE password_hash IS NULL OR password_hash = '' LIMIT 1")
        if cursor.fetchone():
            from .services.auth_service import get_password_hash
            default_pw = get_password_hash("123456")
            cursor.execute("UPDATE users SET password_hash = ?, is_verified = 1 WHERE password_hash IS NULL OR password_hash = ''", (default_pw,))
            conn.commit()
    except Exception as e:
        print("Migration error:", e)

    # -----------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            teacher_name TEXT NOT NULL,
            students_count INTEGER DEFAULT 0
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            FOREIGN KEY (class_id) REFERENCES classes (id)
        )
    """)

    # --- SETTINGS TABLE ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    # --- GRAMMAR RULES TABLE ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS grammar_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            file_name TEXT,
            file_data BLOB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # --- ENROLLMENTS TABLE ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id),
            FOREIGN KEY (class_id) REFERENCES classes(id),
            UNIQUE(student_id, class_id)
        )
    """)

    # --- ASSIGNMENTS TABLE ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER NOT NULL,
            teacher_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            quiz_data TEXT,
            due_date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (class_id) REFERENCES classes(id),
            FOREIGN KEY (teacher_id) REFERENCES users(id)
        )
    """)

    # --- STUDENT SCORES TABLE ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            assignment_id INTEGER NOT NULL,
            score INTEGER DEFAULT 0,
            max_score INTEGER DEFAULT 0,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id),
            FOREIGN KEY (assignment_id) REFERENCES assignments(id),
            UNIQUE(student_id, assignment_id)
        )
    """)

    # --- SAVED VOCABULARY TABLE ---
    # NOTE: UNIQUE(user_id, word, pos) allows saving multiple meanings per word
    # e.g., "run" as verb and "run" as noun are separate entries
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_vocabulary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            word TEXT NOT NULL,
            phonetic TEXT,
            pos TEXT,
            meaning_en TEXT,
            meaning_vn TEXT,
            example TEXT,
            level TEXT DEFAULT 'B1',
            source TEXT DEFAULT 'manual',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, word, pos)
        )
    """)

    # --- DICTIONARY CACHE TABLE (full AI lookup results) ---
    # word_original preserves the original casing (e.g. "IT" vs "it")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dictionary_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT UNIQUE NOT NULL,
            word_original TEXT,
            data_json TEXT NOT NULL,
            meanings_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # --- MIGRATION: Add file columns to lessons ---
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN file_name TEXT")
    except sqlite3.OperationalError: pass
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN file_data BLOB")
    except sqlite3.OperationalError: pass

    # --- MIGRATION: Add teacher_id to classes ---
    try:
        cursor.execute("ALTER TABLE classes ADD COLUMN teacher_id INTEGER REFERENCES users(id)")
    except sqlite3.OperationalError: pass

    # --- MIGRATION: Add word_original to dictionary_cache ---
    try:
        cursor.execute("ALTER TABLE dictionary_cache ADD COLUMN word_original TEXT")
    except sqlite3.OperationalError: pass

    # --- MIGRATION: Recreate saved_vocabulary with UNIQUE(user_id, word, pos) ---
    # SQLite can't alter constraints, so we recreate the table if needed
    try:
        # Check if old constraint exists by testing the schema
        schema_row = cursor.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='saved_vocabulary'"
        ).fetchone()
        if schema_row and "UNIQUE(user_id, word)" in schema_row[0] and "UNIQUE(user_id, word, pos)" not in schema_row[0]:
            print("[DB MIGRATION] Recreating saved_vocabulary with UNIQUE(user_id, word, pos)")
            cursor.execute("ALTER TABLE saved_vocabulary RENAME TO saved_vocabulary_old")
            cursor.execute("""
                CREATE TABLE saved_vocabulary (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    word TEXT NOT NULL,
                    phonetic TEXT,
                    pos TEXT,
                    meaning_en TEXT,
                    meaning_vn TEXT,
                    example TEXT,
                    level TEXT DEFAULT 'B1',
                    source TEXT DEFAULT 'manual',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    UNIQUE(user_id, word, pos)
                )
            """)
            cursor.execute("""
                INSERT OR IGNORE INTO saved_vocabulary 
                    (id, user_id, word, phonetic, pos, meaning_en, meaning_vn, example, level, source, created_at)
                SELECT id, user_id, word, phonetic, pos, meaning_en, meaning_vn, example, level, source, created_at
                FROM saved_vocabulary_old
            """)
            cursor.execute("DROP TABLE saved_vocabulary_old")
            conn.commit()
            print("[DB MIGRATION] saved_vocabulary migrated OK")
    except Exception as e:
        print(f"[DB MIGRATION] saved_vocabulary migration error: {e}")

    # Seed settings from environment variables
    # Use INSERT OR REPLACE so env vars always persist across redeployments
    # (Render's ephemeral filesystem deletes app.db on each deploy)
    env_keys = [
        "GOOGLE_API_KEY", "OPENAI_API_KEY", "COHERE_API_KEY",
        "NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD", "NEO4J_DATABASE",
        "SMTP_SERVER", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "SENDER_EMAIL",
        "EMAIL_PROVIDER", "RESEND_API_KEY", "BREVO_API_KEY", "FRONTEND_URL",
    ]
    for k in env_keys:
        val = os.getenv(k)
        if val:
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, val))
    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM classes")
    if cursor.fetchone()[0] == 0:
        try:
            from .services.auth_service import get_password_hash
            default_pwd = get_password_hash("123456")
        except Exception:
            default_pwd = ""
            
        cursor.execute("INSERT INTO users (name, email, role, password_hash, is_verified) VALUES ('Admin', 'admin@eam.edu.vn', 'ADMIN', ?, 1)", (default_pwd,))
        cursor.execute("INSERT INTO users (name, email, role, password_hash, is_verified) VALUES ('Cô Nguyễn Lan', 'lan.nguyen@eam.edu.vn', 'TEACHER', ?, 1)", (default_pwd,))
        cursor.execute("INSERT INTO users (name, email, role, password_hash, is_verified) VALUES ('Trần Huy', 'huytran123@gmail.com', 'STUDENT', ?, 1)", (default_pwd,))
        cursor.execute("INSERT INTO classes (name, teacher_name, students_count) VALUES ('Lớp TA-Căn bản 01', 'Cô Nguyễn Lan', 35)")
        cursor.execute("INSERT INTO classes (name, teacher_name, students_count) VALUES ('IELTS Bứt phá', 'Thầy David', 12)")
        cursor.execute("INSERT INTO lessons (class_id, title) VALUES (1, 'Bài 1: Thì hiện tại đơn')")
        cursor.execute("INSERT INTO lessons (class_id, title) VALUES (2, 'Reading Task 1')")
        conn.commit()
    conn.close()
    print("[DB] Database initialized OK")

try:
    init_db()
except Exception as e:
    print(f"[DB ERROR] init_db failed: {e}")
    traceback.print_exc()

import threading
_thread_local = threading.local()

def get_db():
    """Thread-safe database connection with WAL mode."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn

def get_setting(key, default=None):
    """Read a single setting: DB first, then env var."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row and row[0]:
        return row[0]
    return os.getenv(key, default)

def set_setting(key, value):
    """Upsert a setting."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

def get_all_settings():
    """Return all settings as a dict, merged with env defaults."""
    settings = {}
    keys = [
        "GOOGLE_API_KEY", "OPENAI_API_KEY",
        "NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD", "NEO4J_DATABASE",
        "SMTP_SERVER", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "SENDER_EMAIL",
        "EMAIL_PROVIDER", "RESEND_API_KEY", "BREVO_API_KEY", "FRONTEND_URL",
    ]
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for k in keys:
        cursor.execute("SELECT value FROM settings WHERE key = ?", (k,))
        row = cursor.fetchone()
        val = (row[0] if row and row[0] else os.getenv(k, "")) or ""
        settings[k] = val
    conn.close()
    return settings

from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: str
    role: str
    password: Optional[str] = None

class ClassCreate(BaseModel):
    name: str
    teacher_name: str
    students_count: int = 0

class LessonCreate(BaseModel):
    class_id: int
    title: str
    content: Optional[str] = None

class AssignmentCreate(BaseModel):
    class_id: int
    title: str
    description: str = ""
    quiz_data: str = ""
    due_date: str = ""



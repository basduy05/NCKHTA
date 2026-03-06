import sqlite3
import os
import traceback
from pydantic import BaseModel
from typing import List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")

def init_db():
    print(f"[DB] Initializing database at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
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

    # --- MIGRATION: Add file columns to lessons ---
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN file_name TEXT")
    except sqlite3.OperationalError: pass
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN file_data BLOB")
    except sqlite3.OperationalError: pass

    # Seed settings from environment variables (only if not already set)
    env_keys = [
        "GOOGLE_API_KEY", "OPENAI_API_KEY",
        "NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD", "NEO4J_DATABASE",
        "SMTP_SERVER", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "SENDER_EMAIL",
        "EMAIL_PROVIDER", "RESEND_API_KEY", "FRONTEND_URL",
    ]
    for k in env_keys:
        val = os.getenv(k)
        if val:
            cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, val))
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

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
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
        "EMAIL_PROVIDER", "RESEND_API_KEY", "FRONTEND_URL",
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



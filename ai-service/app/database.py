import sqlite3
import os
from pydantic import BaseModel
from typing import List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")

def init_db():
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

init_db()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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



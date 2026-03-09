import os
import traceback
import time

try:
    import libsql_experimental as libsql
    SQLITE_OP_ERROR = Exception
    HAS_LIBSQL_EXPERIMENTAL = True
except ImportError:
    HAS_LIBSQL_EXPERIMENTAL = False
    try:
        import libsql
        SQLITE_OP_ERROR = Exception
    except ImportError:
        import sqlite3 as libsql
        SQLITE_OP_ERROR = libsql.OperationalError

from pydantic import BaseModel
from typing import List, Optional

# Use libsql-experimental compatible sqlite3 interface
sqlite3 = libsql

_default_db_path = os.path.join(os.path.dirname(__file__), "app.db")
DB_PATH = os.getenv("DATABASE_PATH", _default_db_path)
TURSO_URL = os.getenv("TURSO_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")
MIN_MEANINGS_COUNT = 3  # Minimum meanings required before skipping AI lookup

class DictRow:
    def __init__(self, cursor, row):
        self._data = {}
        self._row = row
        if hasattr(cursor, 'description') and cursor.description:
            for idx, col in enumerate(cursor.description):
                self._data[col[0]] = row[idx]
        else:
            # Fallback for drivers that don't provide description early or at all
            pass

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._row[key]
        return self._data[key]
        
    def keys(self):
        return self._data.keys()
        
def dict_factory(cursor, row):
    return DictRow(cursor, row)

class CursorWrapper:
    def __init__(self, cursor):
        self._cursor = cursor
    def execute(self, *args, **kwargs):
        self._cursor.execute(*args, **kwargs)
        return self
    def fetchone(self):
        row = self._cursor.fetchone()
        if row: return DictRow(self._cursor, row)
        return None
    def fetchall(self):
        rows = self._cursor.fetchall()
        return [DictRow(self._cursor, row) for row in rows]
    def __iter__(self):
        for row in self._cursor:
            yield DictRow(self._cursor, row)
    def __getattr__(self, name):
        return getattr(self._cursor, name)

class ConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn
    def cursor(self):
        return CursorWrapper(self._conn.cursor())
    def execute(self, *args, **kwargs):
        cursor = self._conn.cursor()
        cursor.execute(*args, **kwargs)
        return CursorWrapper(cursor)
    def commit(self): self._conn.commit()
    def close(self): self._conn.close()
    def __enter__(self): return self
    def __exit__(self, exc_type, exc_val, exc_tb): self._conn.close()
    def __getattr__(self, name):
        return getattr(self._conn, name)

def get_db(retries=3):
    """
    Consolidated thread-safe database connection.
    Connects to Turso if configured, otherwise falls back to local SQLite.
    Includes WAL mode and retry logic for robustness.
    """
    global TURSO_URL, TURSO_AUTH_TOKEN
    # Refresh env vars in case they were set dynamically
    TURSO_URL = (os.getenv("TURSO_URL") or "").strip()
    TURSO_AUTH_TOKEN = (os.getenv("TURSO_AUTH_TOKEN") or "").strip()

    for attempt in range(retries):
        try:
            if TURSO_URL and TURSO_AUTH_TOKEN:
                if HAS_LIBSQL_EXPERIMENTAL:
                    # libSQL experimental with Turso sync (Local Replica)
                    conn = libsql.connect(database=DB_PATH, sync_url=TURSO_URL, auth_token=TURSO_AUTH_TOKEN)
                    try:
                        conn.sync()
                    except Exception as e:
                        print(f"[DB] Turso sync failed: {e}")
                else:
                    # libSQL (standard/new) - Using Direct Connection URL
                    try:
                         # Method 1: standard auth_token keyword
                         url_to_use = TURSO_URL.replace("libsql://", "https://")
                         conn = libsql.connect(url_to_use, auth_token=TURSO_AUTH_TOKEN)
                    except (TypeError, Exception):
                         # Method 2: Token in URL fallback
                         token_url = f"{TURSO_URL}?authToken={TURSO_AUTH_TOKEN}"
                         conn = libsql.connect(token_url)
            else:
                # standard sqlite3 or libsql without sync
                conn = libsql.connect(DB_PATH)
            
            # Use standard Row for builtin sqlite3 if possible, but our wrapper is more consistent
            try:
                conn.row_factory = dict_factory
            except Exception:
                pass
            
            # Performance & Concurrency settings
            try:
                # PRAGMAs only for local SQLite
                is_remote = TURSO_URL and TURSO_AUTH_TOKEN and not HAS_LIBSQL_EXPERIMENTAL
                if not is_remote:
                    conn.execute("PRAGMA journal_mode=WAL")
                    conn.execute("PRAGMA busy_timeout=10000")
            except Exception:
                pass
                
            return ConnectionWrapper(conn)
            
        except Exception as e:
            if attempt < retries - 1:
                print(f"[DB] Connection attempt {attempt+1} failed: {e}, retrying...")
                time.sleep(1.0 * (attempt + 1))
            else:
                print(f"[DB] All {retries} connection attempts failed: {e}")
                raise

def init_db():
    print(f"[DB] Initializing database at {DB_PATH}")
    if TURSO_URL and TURSO_AUTH_TOKEN:
        print("[DB] Using Turso External Connection")
    conn = get_db()
    
    # Check if we are using libsql or standard sqlite3
    try:
        driver_name = conn.__class__.__module__
    except Exception:
        driver_name = "unknown"
        
    if 'libsql' not in driver_name:
        # Prevent lock when multiple users for normal sqlite
        try:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA busy_timeout=5000")
        except Exception:
            pass

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
    except SQLITE_OP_ERROR: pass
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN otp TEXT")
    except SQLITE_OP_ERROR: pass
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0")
    except SQLITE_OP_ERROR: pass
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
    except SQLITE_OP_ERROR: pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN otp_expires INTEGER")
    except SQLITE_OP_ERROR: pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN password_reset_token TEXT")
    except SQLITE_OP_ERROR: pass
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN password_reset_expires INTEGER")
    except SQLITE_OP_ERROR: pass

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
    
    # --- DICTIONARY CACHE TABLE ---
    try:
        cursor.execute("SELECT data_json FROM dictionary_cache LIMIT 1")
    except Exception:
        # Table might be missing 'data_json' or not exist at all, or have old 'data' name
        print("[DB] dictionary_cache schema mismatch or missing. Resetting to match routers...")
        cursor.execute("DROP TABLE IF EXISTS dictionary_cache")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dictionary_cache (
                word TEXT PRIMARY KEY,
                word_original TEXT,
                data_json TEXT,
                meanings_count INTEGER,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

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
        cursor.execute("ALTER TABLE saved_vocabulary ADD COLUMN audio_url TEXT")
    except SQLITE_OP_ERROR: pass

    # --- MIGRATION: Add file columns to lessons ---
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN file_name TEXT")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN file_data BLOB")
    except SQLITE_OP_ERROR: pass

    # --- MIGRATION: Add teacher_id to classes ---
    try:
        cursor.execute("ALTER TABLE classes ADD COLUMN teacher_id INTEGER REFERENCES users(id)")
    except SQLITE_OP_ERROR: pass

    # --- MIGRATION: Add word_original to dictionary_cache ---
    try:
        cursor.execute("ALTER TABLE dictionary_cache ADD COLUMN word_original TEXT")
    except SQLITE_OP_ERROR: pass

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
        "SMTP_SERVER", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD",
        "SENDER_EMAIL", "SENDER_NAME",
        "EMAIL_PROVIDER", "RESEND_API_KEY", "BREVO_API_KEY",
        "FRONTEND_URL", "SECRET_KEY", "ALLOWED_ORIGINS",
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

# --- REMOVED DUPLICATE get_db ---

def get_setting(key, default=None):
    """Read a single setting: DB first, then env var."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        if row and row['value']:
            return row['value']
    except Exception as e:
        print(f"[DB SETTINGS] Error reading '{key}': {e}")
    return os.getenv(key, default)

def set_setting(key, value):
    """Upsert a setting."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB SETTINGS] Error writing '{key}': {e}")

def get_all_settings():
    """Returns all settings as a dictionary."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings")
        rows = cursor.fetchall()
        conn.close()
        settings = {row['key']: row['value'] for row in rows}
        return settings
    except Exception:
        return {}

def get_cached_dictionary(word: str):
    """Retrieve dictionary data from DB cache (matches router schema)."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT data_json FROM dictionary_cache WHERE word = ?", (word.lower().strip(),))
        row = cursor.fetchone()
        conn.close()
        if row and row['data_json']:
            import json
            return json.loads(row['data_json'])
    except Exception as e:
        # Fallback check for old 'data' column if it still exists somehow
        try:
             conn = get_db()
             cursor = conn.cursor()
             cursor.execute("SELECT data FROM dictionary_cache WHERE word = ?", (word.lower().strip(),))
             row = cursor.fetchone()
             conn.close()
             if row and row['data']:
                 import json
                 return json.loads(row['data'])
        except Exception: pass
        # print(f"[DB CACHE] Get error for '{word}': {e}")
    return None

def set_cached_dictionary(word: str, data: dict):
    """Save dictionary data to DB cache (matches router schema)."""
    try:
        import json
        json_data = json.dumps(data, ensure_ascii=False)
        mc = len(data.get("meanings", []))
        word_original = data.get("word", word)
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT OR REPLACE INTO dictionary_cache (word, word_original, data_json, meanings_count, updated_at) 
               VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)""", 
            (word.lower().strip(), word_original, json_data, mc)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB CACHE] Set error for '{word}': {e}")

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



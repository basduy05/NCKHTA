import os
import traceback
import time
from pathlib import Path

try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=_env_path)
except Exception:
    pass

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
        
    def get(self, key, default=None):
        return self._data.get(key, default)
        
    def keys(self):
        return self._data.keys()
        
    def __iter__(self):
        return iter(self._data)
        
    def __len__(self):
        return len(self._data)
        
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
    def close(self):
        # We are using thread-local pooling, so do not actually close the connection.
        # This allows routers to safely call conn.close() without killing the shared connection.
        pass
    def really_close(self):
        self._conn.close()
    def __enter__(self): return self
    def __exit__(self, exc_type, exc_val, exc_tb): pass
    def __getattr__(self, name):
        return getattr(self._conn, name)

def get_db(retries=3):
    """
    Consolidated thread-safe database connection.
    Connects to Turso if configured, otherwise falls back to local SQLite.
    Includes WAL mode and retry logic for robustness.
    """
import threading

_thread_local = threading.local()
_settings_cache = {}
_settings_lock = threading.Lock()
SETTINGS_TTL = 300  # 5 minutes

def get_db(retries=3):
    """
    Consolidated thread-safe database connection with pooling.
    Connects to Turso if configured, otherwise falls back to local SQLite.
    Reuses connections within the same thread/request for better performance.
    """
    # Check if we already have a connection in this thread
    if hasattr(_thread_local, "db_conn") and _thread_local.db_conn:
        import time
        now = time.time()
        last_check = getattr(_thread_local, "last_check", 0)
        
        if now - last_check > 30:
            try:
                # Test if connection is still alive (only once every 30s)
                _thread_local.db_conn.execute("SELECT 1")
                _thread_local.last_check = now
            except Exception:
                # Connection dead, remove it
                _thread_local.db_conn = None
        
        if _thread_local.db_conn:
            return _thread_local.db_conn

    global TURSO_URL, TURSO_AUTH_TOKEN
    # Refresh env vars only if not already set to save time
    if not TURSO_URL:
        TURSO_URL = (os.getenv("TURSO_URL") or "").strip()
    if not TURSO_AUTH_TOKEN:
        TURSO_AUTH_TOKEN = (os.getenv("TURSO_AUTH_TOKEN") or "").strip()

    is_render = bool(os.getenv("RENDER"))
    force_local_db = os.getenv("FORCE_LOCAL_DB", "0") == "1"
    online_db_only = os.getenv("ONLINE_DB_ONLY", "1") == "1"
    # Online-first mode: use Turso whenever credentials are configured.
    use_turso = bool(TURSO_URL and TURSO_AUTH_TOKEN and not force_local_db)

    if online_db_only and not use_turso:
        raise RuntimeError("ONLINE_DB_ONLY=1 but TURSO_URL/TURSO_AUTH_TOKEN are missing or FORCE_LOCAL_DB=1")

    for attempt in range(retries):
        try:
            if use_turso:
                # Direct Connection Strategy
                try:
                    url_to_use = TURSO_URL
                    if not url_to_use.startswith(("https://", "libsql://")):
                        url_to_use = f"https://{url_to_use}"
                    else:
                        url_to_use = url_to_use.replace("libsql://", "https://")
                    
                    try:
                        conn = libsql.connect(url_to_use, auth_token=TURSO_AUTH_TOKEN)
                    except (TypeError, Exception):
                        try:
                            conn = libsql.connect(url_to_use, authToken=TURSO_AUTH_TOKEN)
                        except (TypeError, Exception):
                            token_url = f"{url_to_use}?authToken={TURSO_AUTH_TOKEN}"
                            conn = libsql.connect(token_url)
                except Exception as e:
                    if online_db_only:
                        raise e
                    if HAS_LIBSQL_EXPERIMENTAL and not is_render:
                        try:
                            conn = libsql.connect(database=DB_PATH, sync_url=TURSO_URL, auth_token=TURSO_AUTH_TOKEN)
                        except Exception:
                            print(f"[DB ERROR] Turso sync failed, falling back to local: {e}")
                            conn = libsql.connect(DB_PATH)
                    elif not is_render:
                        # DEVELOPMENT FALLBACK: Use local if Turso fails
                        print(f"[DB ERROR] Turso connection failed, falling back to local: {e}")
                        conn = libsql.connect(DB_PATH)
                    else:
                        raise e
            else:
                # Standard Local SQLite fallback
                conn = libsql.connect(DB_PATH)
            
            try:
                conn.row_factory = dict_factory
            except Exception:
                pass
            
            # Performance & Concurrency settings
            try:
                is_remote = use_turso and not HAS_LIBSQL_EXPERIMENTAL
                if not is_remote:
                    conn.execute("PRAGMA journal_mode=WAL")
                    conn.execute("PRAGMA busy_timeout=10000")
                    conn.execute("PRAGMA synchronous=NORMAL") # Faster but still safe
                    conn.execute("PRAGMA cache_size=10000") # ~10MB to 40MB cache
                    conn.execute("PRAGMA mmap_size=268435456") # 256MB mmap
            except Exception:
                pass
                
            wrapper = ConnectionWrapper(conn)
            # Store in thread-local for reuse
            _thread_local.db_conn = wrapper
            return wrapper
            
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(0.5 * (attempt + 1))
            else:
                raise

def init_db():
    print(f"[DB] Initializing database at {DB_PATH}")
    force_local_db = os.getenv("FORCE_LOCAL_DB", "0") == "1"
    online_db_only = os.getenv("ONLINE_DB_ONLY", "1") == "1"
    use_turso = bool(TURSO_URL and TURSO_AUTH_TOKEN and not force_local_db)
    if online_db_only and not use_turso:
        raise RuntimeError("ONLINE_DB_ONLY=1 but TURSO_URL/TURSO_AUTH_TOKEN are missing or FORCE_LOCAL_DB=1")
    if use_turso:
        print("[DB] Using Turso External Connection")
    else:
        print("[DB] Using Local SQLite Connection")
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

    # --- MIGRATION: AI Credits for users ---
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN credits_ai INTEGER DEFAULT 50")
    except SQLITE_OP_ERROR: pass

    # --- MIGRATION: Phone number for user ---
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN phone TEXT")
    except SQLITE_OP_ERROR: pass

    # --- MIGRATION: Login 2FA OTP ---
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN login_otp TEXT")
    except SQLITE_OP_ERROR: pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN login_otp_expires INTEGER")
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

    # --- MIGRATION: JWT Blacklist (Session Revocation) ---
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS revoked_tokens (
                jti TEXT PRIMARY KEY,
                expires_at INTEGER NOT NULL
            )
        """)
        conn.commit()
    except Exception as e:
        print(f"[DB MIGRATION] revoked_tokens error: {e}")

    # --- PERFORMANCE INDEXES ---
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens(expires_at)")
    except Exception: pass

    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_role_points ON users(role, points DESC)")
    except Exception: pass

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

    # --- GENERATED EXAMS TABLE ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS generated_exams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            test_type TEXT,
            title TEXT,
            exam_data TEXT,
            score INTEGER,
            max_score INTEGER,
            completed BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
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
    
    # --- PERFORMANCE INDEXES ---
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_generated_exams_user_id ON generated_exams(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_student_scores_student_id ON student_scores(student_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_saved_vocabulary_user_id ON saved_vocabulary(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_saved_vocabulary_scheduled_at ON saved_vocabulary(scheduled_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_study_logs_user_id ON study_logs(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_study_logs_word_id ON study_logs(word_id)")
    except Exception: pass

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
            type TEXT DEFAULT 'quiz',
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

    # --- AI PRACTICE HISTORY TABLE (For self-study tracking) ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_practice_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            feature_name TEXT NOT NULL,
            topic TEXT,
            score INTEGER DEFAULT 0,
            max_score INTEGER DEFAULT 0,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id)
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
    conn.commit()

    # --- MIGRATION: Vocabulary SR & User Points ---
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0")
    except SQLITE_OP_ERROR: pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN target_goal TEXT DEFAULT 'General English'")
    except SQLITE_OP_ERROR: pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN current_level TEXT DEFAULT 'B1'")
    except SQLITE_OP_ERROR: pass

    try:
        cursor.execute("ALTER TABLE saved_vocabulary ADD COLUMN last_reviewed_at TIMESTAMP")
    except SQLITE_OP_ERROR: pass

    try:
        cursor.execute("ALTER TABLE saved_vocabulary ADD COLUMN review_count INTEGER DEFAULT 0")
    except SQLITE_OP_ERROR: pass

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

    # --- MIGRATION: Phase 1 - 4 Skills and Bloom's Taxonomy Tracking ---
    try:
        cursor.execute("ALTER TABLE generated_exams ADD COLUMN skill_type TEXT")
    except SQLITE_OP_ERROR: pass
    
    try:
        cursor.execute("ALTER TABLE generated_exams ADD COLUMN bloom_level TEXT")
    except SQLITE_OP_ERROR: pass
    
    try:
        cursor.execute("ALTER TABLE assignments ADD COLUMN skill_type TEXT")
    except SQLITE_OP_ERROR: pass
    
    try:
        cursor.execute("ALTER TABLE assignments ADD COLUMN bloom_level TEXT")
    except SQLITE_OP_ERROR: pass

    try:
        cursor.execute("ALTER TABLE assignments ADD COLUMN type TEXT DEFAULT 'quiz'")
    except SQLITE_OP_ERROR: pass

    try:
        cursor.execute("ALTER TABLE student_scores ADD COLUMN bloom_evaluation JSON")
    except SQLITE_OP_ERROR: pass

    # --- MIGRATION: FSRS Spaced Repetition Logic ---
    try:
        cursor.execute("ALTER TABLE saved_vocabulary ADD COLUMN stability REAL DEFAULT 0.0")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE saved_vocabulary ADD COLUMN difficulty REAL DEFAULT 0.0")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE saved_vocabulary ADD COLUMN retrievability REAL DEFAULT 0.0")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE saved_vocabulary ADD COLUMN scheduled_at TIMESTAMP")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE saved_vocabulary ADD COLUMN reps INTEGER DEFAULT 0")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE saved_vocabulary ADD COLUMN lapses INTEGER DEFAULT 0")
    except SQLITE_OP_ERROR: pass

    # --- MIGRATION: Exam History Enhancement ---
    try:
        cursor.execute("ALTER TABLE generated_exams ADD COLUMN user_answers TEXT")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE generated_exams ADD COLUMN feedback TEXT")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE generated_exams ADD COLUMN skill TEXT")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE generated_exams ADD COLUMN time_spent INTEGER")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE student_scores ADD COLUMN submission_text TEXT")
    except SQLITE_OP_ERROR: pass

    # --- STUDY LOGS TABLE (For FSRS review history) ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS study_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            word_id INTEGER NOT NULL,
            rating INTEGER NOT NULL,
            stability REAL NOT NULL,
            difficulty REAL NOT NULL,
            elapsed_days INTEGER NOT NULL,
            scheduled_days INTEGER NOT NULL,
            review_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (word_id) REFERENCES saved_vocabulary(id)
        )
    """)

    # --- STUDENT ROADMAPS TABLE ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_roadmaps (
            user_id INTEGER PRIMARY KEY,
            roadmap_data TEXT NOT NULL,
            last_stats_hash TEXT
        )
    """)

    # --- AI LOGS TABLE (For Performance Monitoring) ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            endpoint TEXT,
            model TEXT,
            difficulty TEXT,
            latency_ms INTEGER,
            status TEXT,
            error_message TEXT,
            feature TEXT DEFAULT 'Unknown',
            response_content TEXT,
            eval_score INTEGER,
            eval_feedback TEXT,
            created_at TIMESTAMP DEFAULT (DATETIME('now', '+7 hours'))
        )
    """)
    
    # --- MIGRATIONS FOR AI LOGS ---
    try:
        cursor.execute("ALTER TABLE ai_logs ADD COLUMN feature TEXT DEFAULT 'Unknown'")
    except SQLITE_OP_ERROR: pass # Already exists
    
    try:
        cursor.execute("ALTER TABLE ai_logs ADD COLUMN response_content TEXT")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE ai_logs ADD COLUMN eval_score INTEGER")
    except SQLITE_OP_ERROR: pass
    try:
        cursor.execute("ALTER TABLE ai_logs ADD COLUMN eval_feedback TEXT")
    except SQLITE_OP_ERROR: pass

    # --- PERFORMANCE INDEXES FOR AI MONITORING ---
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ai_logs_feature ON ai_logs(feature)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ai_logs_model_difficulty ON ai_logs(model, difficulty)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ai_logs_status ON ai_logs(status)")
    except Exception:
        pass

    # --- PROVIDER STATUS TABLE (For Fallback Management) ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS provider_status (
            provider_name TEXT PRIMARY KEY,
            last_failed_at TIMESTAMP DEFAULT (DATETIME('now', '+7 hours')),
            failure_count INTEGER DEFAULT 0
        )
    """)
    
    # --- MIGRATIONS FOR DICTIONARY CACHE ---
    try:
        cursor.execute("ALTER TABLE dictionary_cache ADD COLUMN word_original TEXT")
    except SQLITE_OP_ERROR: pass

    conn.commit()

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
    # Use INSERT OR IGNORE so env vars only fill EMPTY slots
    # This preserves user-modified settings across redeployments
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
            # Use INSERT OR IGNORE to avoid overwriting user-modified settings
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

# REMOVED: Eager init_db() call to prevent circular imports during service loading.
# Initialization now happens in main.py lifespan.

import threading
_thread_local = threading.local()

# --- REMOVED DUPLICATE get_db ---

def get_setting(key, default=None):
    """Read a single setting with multi-layer caching: Memory -> DB -> Env."""
    # 1. Memory Cache
    now = time.time()
    with _settings_lock:
        if key in _settings_cache:
            val, ts = _settings_cache[key]
            if now - ts < SETTINGS_TTL:
                return val

    # 2. Database Cache
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        
        val = None
        if row and row['value']:
            val = row['value']
        else:
            # 3. Environment Fallback
            val = os.getenv(key, default)
            
        # Update memory cache
        with _settings_lock:
            _settings_cache[key] = (val, now)
        return val
    except Exception as e:
        print(f"[DB SETTINGS] Error reading '{key}': {e}")
        return os.getenv(key, default)

def set_setting(key, value):
    """Upsert a setting."""
    print(f"[DB SETTINGS] Attempting to save: {key} = {value[:20]}..." if len(str(value)) > 20 else f"[DB SETTINGS] Attempting to save: {key} = {value}", flush=True)
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
        conn.commit()
        print(f"[DB SETTINGS] Committed {key} to local DB", flush=True)
        
        # Sync to Turso after write (required for libsql-experimental)
        # Also try with standard libsql in case it helps
        try:
            if HAS_LIBSQL_EXPERIMENTAL and TURSO_URL and TURSO_AUTH_TOKEN:
                conn.sync()
                print(f"[DB SETTINGS] Synced '{key}' to Turso (libsql_experimental)", flush=True)
            elif TURSO_URL and TURSO_AUTH_TOKEN:
                # For standard libsql, try to verify write worked
                cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
                result = cursor.fetchone()
                print(f"[DB SETTINGS] Verified {key}: {result}", flush=True)
        except Exception as sync_err:
            print(f"[DB SETTINGS] Sync/verify failed for '{key}': {sync_err}", flush=True)
            
        conn.close()
        print(f"[DB SETTINGS] Successfully saved: {key}", flush=True)
    except Exception as e:
        print(f"[DB SETTINGS] Error writing '{key}': {e}", flush=True)
        import traceback
        traceback.print_exc()

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
        return None
    except Exception as e:
        # print(f"[DB CACHE] Get error for '{word}': {e}")
        return None

def log_ai_request(user_id, endpoint, model, difficulty, latency_ms, status, error="", feature="Unknown", response_content=None, eval_score=None, eval_feedback=None):
    """Enhanced logging for AI performance monitoring with evaluation data and GMT+7 timestamps."""
    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO ai_logs (user_id, endpoint, model, difficulty, latency_ms, status, error_message, feature, response_content, eval_score, eval_feedback, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now', '+7 hours'))
        """, (user_id, endpoint, model, difficulty, latency_ms, status, error, feature, response_content, eval_score, eval_feedback))
        conn.commit()
    except Exception as e:
        print(f"[DB ERROR] log_ai_request: {e}")

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
        print(f"[DB CACHE] Committed cache for '{word}'", flush=True)
        
        # Sync to Turso after write (required for libsql-experimental)
        try:
            if HAS_LIBSQL_EXPERIMENTAL and TURSO_URL and TURSO_AUTH_TOKEN:
                conn.sync()
                print(f"[DB CACHE] Synced '{word}' to Turso", flush=True)
        except Exception as sync_err:
            print(f"[DB CACHE] Sync failed for '{word}': {sync_err}", flush=True)
        
        conn.close()
    except Exception as e:
        print(f"[DB CACHE] Set error for '{word}': {e}", flush=True)

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
    type: str = "quiz"
    quiz_data: str = ""
    due_date: str = ""
    skill_type: Optional[str] = None
    bloom_level: Optional[str] = None

def mark_provider_failed(provider_name: str):
    """Mark an AI provider as failed in the database."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO provider_status (provider_name, last_failed_at, failure_count)
            VALUES (?, CURRENT_TIMESTAMP, 1)
            ON CONFLICT(provider_name) DO UPDATE SET
                last_failed_at = CURRENT_TIMESTAMP,
                failure_count = failure_count + 1
        """, (provider_name,))
        conn.commit()
        print(f"[DB] Provider {provider_name} marked as FAILED")
    except Exception as e:
        print(f"[DB LOG ERROR] {e}")

def is_provider_failed(provider_name: str, window_minutes: int = 10) -> bool:
    """Check if an AI provider has failed recently."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        # Note: SQLite datetime strings are 'YYYY-MM-DD HH:MM:SS'
        # We check if (last_failed_at + window_minutes) > CURRENT_TIMESTAMP
        cursor.execute("""
            SELECT last_failed_at FROM provider_status 
            WHERE provider_name = ? 
            AND last_failed_at > datetime('now', '-' || ? || ' minutes')
        """, (provider_name, window_minutes))
        result = cursor.fetchone()
        return result is not None
    except Exception as e:
        # print(f"[DB LOG ERROR] {e}")
        return False



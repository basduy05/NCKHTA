-- ==============================================================================
-- NCKHTA / iEdu Database Schema (SQLite / libSQL / Turso)
-- Updated: Phase 0 Synchronization
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. USERS & AUTHENTICATION
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'STUDENT', -- ADMIN, TEACHER, STUDENT
    password_hash TEXT,
    otp TEXT,
    is_verified BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    otp_expires INTEGER,
    password_reset_token TEXT,
    password_reset_expires INTEGER,
    credits_ai INTEGER DEFAULT 50,
    phone TEXT,
    login_otp TEXT,
    login_otp_expires INTEGER,
    points INTEGER DEFAULT 0,
    target_goal TEXT DEFAULT 'General English',
    current_level TEXT DEFAULT 'B1'
);

-- 2. JWT REVOKED TOKENS (SESSION REVOCATION)
CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
);

-- 3. CLASSES & LESSONS
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    teacher_id INTEGER REFERENCES users(id),
    students_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    file_name TEXT,
    file_data BLOB,
    FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(student_id, class_id)
);

-- 4. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 5. DICTIONARY CACHE
CREATE TABLE IF NOT EXISTS dictionary_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT UNIQUE NOT NULL,
    word_original TEXT,
    data_json TEXT NOT NULL,
    meanings_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. GRAMMAR RULES & QUIZZES
CREATE TABLE IF NOT EXISTS grammar_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    file_name TEXT,
    file_data BLOB,
    level TEXT DEFAULT 'B1',
    parent_id INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grammar_quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    type TEXT DEFAULT 'MCQ',
    options TEXT DEFAULT '[]',
    answer TEXT NOT NULL DEFAULT '',
    explanation_vn TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT (DATETIME('now', '+7 hours')),
    FOREIGN KEY (rule_id) REFERENCES grammar_rules(id) ON DELETE CASCADE
);

-- 7. ASSIGNMENTS & STUDENT SCORES
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'quiz',
    quiz_data TEXT,
    due_date TEXT,
    skill_type TEXT,
    bloom_level TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    assignment_id INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    bloom_evaluation JSON,
    submission_text TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    UNIQUE(student_id, assignment_id)
);

-- 8. GENERATED EXAMS & PRACTICE HISTORY
CREATE TABLE IF NOT EXISTS generated_exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    test_type TEXT,
    title TEXT,
    exam_data TEXT,
    score INTEGER,
    max_score INTEGER,
    completed BOOLEAN DEFAULT 0,
    skill_type TEXT,
    bloom_level TEXT,
    user_answers TEXT,
    feedback TEXT,
    skill TEXT,
    time_spent INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_practice_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    feature_name TEXT NOT NULL,
    topic TEXT,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. SPACED REPETITION (FSRS) & SAVED VOCABULARY
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
    audio_url TEXT,
    last_reviewed_at TIMESTAMP,
    review_count INTEGER DEFAULT 0,
    stability REAL DEFAULT 0.0,
    difficulty REAL DEFAULT 0.0,
    retrievability REAL DEFAULT 0.0,
    scheduled_at TIMESTAMP,
    reps INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, word, pos)
);

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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (word_id) REFERENCES saved_vocabulary(id) ON DELETE CASCADE
);

-- 10. STUDENT ROADMAPS
CREATE TABLE IF NOT EXISTS student_roadmaps (
    user_id INTEGER PRIMARY KEY,
    roadmap_data TEXT NOT NULL,
    last_stats_hash TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. AI MONITORING & LOGGING
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
);

CREATE TABLE IF NOT EXISTS provider_status (
    provider_name TEXT PRIMARY KEY,
    last_failed_at TIMESTAMP DEFAULT (DATETIME('now', '+7 hours')),
    failure_count INTEGER DEFAULT 0
);

-- 12. USER FEEDBACK
CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_name TEXT,
    feedback_type TEXT NOT NULL,
    feature TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMP DEFAULT (DATETIME('now', '+7 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==============================================================================
-- PERFORMANCE & FILTER INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_role_points ON users(role, points DESC);
CREATE INDEX IF NOT EXISTS idx_generated_exams_user_id ON generated_exams(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_student_id ON student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_user ON student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_saved_vocabulary_user_id ON saved_vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_vocabulary_scheduled_at ON saved_vocabulary(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_saved_vocab_user_scheduled ON saved_vocabulary(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_study_logs_user_id ON study_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_user_date ON study_logs(user_id, review_at);
CREATE INDEX IF NOT EXISTS idx_study_logs_word_id ON study_logs(word_id);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti ON revoked_tokens(jti);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_feature ON ai_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_logs_model_difficulty ON ai_logs(model, difficulty);
CREATE INDEX IF NOT EXISTS idx_ai_logs_status ON ai_logs(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

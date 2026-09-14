-- ============================================================================
-- iEdu / NCKHTA PostgreSQL Production Schema (Phase 2 - Task 2.16)
-- Compatible with PostgreSQL 14+, Supabase, Neon.tech, Render Postgres, AWS RDS
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'STUDENT', -- 'STUDENT', 'TEACHER', 'ADMIN'
    avatar_url TEXT DEFAULT '',
    points INTEGER DEFAULT 0,
    credits_ai INTEGER DEFAULT 50,
    cefr_level VARCHAR(10) DEFAULT 'B1',
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Classes table
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    students_count INTEGER DEFAULT 0,
    teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, class_id)
);

-- 4. Lessons table
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    type VARCHAR(50) DEFAULT 'quiz',
    quiz_data TEXT DEFAULT '',
    due_date VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Student Scores table
CREATE TABLE IF NOT EXISTS student_scores (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    ai_feedback TEXT DEFAULT '',
    teacher_feedback TEXT DEFAULT '',
    teacher_reviewed INTEGER DEFAULT 0,
    answers_data TEXT DEFAULT '',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, assignment_id)
);

-- 7. Saved Vocabulary table
CREATE TABLE IF NOT EXISTS saved_vocabulary (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    phonetic VARCHAR(100),
    pos VARCHAR(50),
    meaning_en TEXT,
    meaning_vn TEXT,
    example TEXT,
    level VARCHAR(10) DEFAULT 'B1',
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_vocab_user ON saved_vocabulary(user_id, created_at DESC);

-- 8. Search History table
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    searched_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_search_hist_user ON search_history(user_id, searched_at DESC);

-- 9. User Point Logs table
CREATE TABLE IF NOT EXISTS user_point_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    points INTEGER NOT NULL,
    details TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_point_logs_user ON user_point_logs(user_id, created_at DESC);

-- 10. Placement Test Results table
CREATE TABLE IF NOT EXISTS user_placement_results (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    cefr_level VARCHAR(10) NOT NULL,
    breakdown_json TEXT DEFAULT '{}',
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Daily Challenges table
CREATE TABLE IF NOT EXISTS user_daily_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_key VARCHAR(100) NOT NULL,
    challenge_date VARCHAR(20) NOT NULL,
    progress INTEGER DEFAULT 0,
    target INTEGER DEFAULT 1,
    completed INTEGER DEFAULT 0,
    claimed INTEGER DEFAULT 0,
    claimed_at TIMESTAMPTZ,
    UNIQUE(user_id, challenge_key, challenge_date)
);

-- 12. Streak Milestones table
CREATE TABLE IF NOT EXISTS user_streak_milestones (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_days INTEGER NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    points_awarded INTEGER NOT NULL,
    PRIMARY KEY (user_id, milestone_days)
);

-- 13. Chat Rooms & Messages tables
CREATE TABLE IF NOT EXISTS chat_rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    room_type VARCHAR(20) DEFAULT 'direct', -- 'direct', 'group'
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_members (
    room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'system'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_room ON chat_messages(room_id, id DESC);

CREATE TABLE IF NOT EXISTS chat_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS user_presence (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Grammar Rules & Quizzes
CREATE TABLE IF NOT EXISTS grammar_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    level VARCHAR(10) DEFAULT 'B1',
    parent_id INTEGER REFERENCES grammar_rules(id) ON DELETE SET NULL,
    file_name VARCHAR(255),
    file_data BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grammar_quizzes (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER NOT NULL REFERENCES grammar_rules(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'choice',
    options TEXT,
    answer TEXT NOT NULL,
    explanation_vn TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Badges table
CREATE TABLE IF NOT EXISTS badges (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description_vn TEXT,
    icon VARCHAR(50) NOT NULL,
    tier VARCHAR(20) DEFAULT 'bronze',
    condition_type VARCHAR(50) NOT NULL,
    condition_value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

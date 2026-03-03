-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'STUDENT', -- STUDENT, TEACHER, ADMIN
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classes table
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    teacher_id INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enrollment table (Many-to-Many Users <-> Classes)
CREATE TABLE enrollments (
    user_id INT REFERENCES users(id),
    class_id INT REFERENCES classes(id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, class_id)
);

-- Scores/Progress table
CREATE TABLE scores (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    activity_type VARCHAR(50), -- QUIZ, GAME, ASSIGNMENT
    score INT,
    max_score INT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

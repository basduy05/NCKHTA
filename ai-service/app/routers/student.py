from fastapi import APIRouter, Depends, HTTPException, Header, Query, UploadFile, File, Form, BackgroundTasks, Response
from ..database import get_db
from ..services import auth_service, llm_service, graph_service, file_service
from pydantic import BaseModel
from typing import Optional, List
import datetime
import math
import json
import traceback

# --- FSRS Spaced Repetition Logic (Simplified FSRS v4) ---
class FSRS:
    # Default weights for FSRS v4 (simplified)
    # w[0]-w[3]: initial stability for ratings 1-4
    # w[4]: difficulty initial weight
    # w[5]: difficulty adjunct weight
    # w[6]: difficulty decay weight
    # w[7]: stability decay weight
    # w[8]: stability exponential weight
    # w[9]: stability benefit weight (for correct recall)
    # w[10]: stability punishment weight (for forgetting)
    W = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.26, 2.05]

    @staticmethod
    def init_stability(rating):
        return FSRS.W[rating - 1]

    @staticmethod
    def init_difficulty(rating):
        return min(max(FSRS.W[4] - FSRS.W[5] * (rating - 3), 1.0), 10.0)

    @staticmethod
    def next_interval(stability, request_retention=0.9):
        return max(1, round(stability / 9 * (1 / request_retention - 1)))

    @staticmethod
    def update_difficulty(difficulty, rating):
        next_d = difficulty - FSRS.W[6] * (rating - 3)
        return min(max(next_d, 1.0), 10.0)

    @staticmethod
    def update_stability_forget(stability, difficulty, retrievability):
        # stability punishment after forgetting
        return min(FSRS.W[11] * math.pow(difficulty, -FSRS.W[12]) * (math.pow(stability + 1, FSRS.W[13]) - 1) * math.exp(FSRS.W[14] * (1 - retrievability)), stability)

    @staticmethod
    def update_stability_recall(stability, difficulty, retrievability, rating):
        hard_penalty = FSRS.W[15] if rating == 2 else 1.0
        easy_bonus = FSRS.W[16] if rating == 4 else 1.0
        return stability * (1 + math.exp(FSRS.W[8]) * (11 - difficulty) * math.pow(stability, -FSRS.W[9]) * (math.exp((1 - retrievability) * FSRS.W[10]) - 1) * hard_penalty * easy_bonus)

    @staticmethod
    def get_retrievability(stability, elapsed_days):
        return math.pow(1 + 0.1 * elapsed_days / stability, -1) if stability > 0 else 0

    @classmethod
    def update_card(cls, card, rating):
        # card = {stability, difficulty, scheduled_at, last_reviewed_at, reps, lapses}
        # rating: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
        
        now = datetime.datetime.now()
        last_review = card.get("last_reviewed_at")
        if isinstance(last_review, str):
            last_review = datetime.datetime.fromisoformat(last_review.replace('Z', '+00:00'))
        
        if not last_review or card.get("reps", 0) == 0:
            # First time review
            new_stability = cls.init_stability(rating)
            new_difficulty = cls.init_difficulty(rating)
            elapsed_days = 0
        else:
            elapsed_days = (now - last_review).days
            retrievability = cls.get_retrievability(card["stability"], elapsed_days)
            
            if rating == 1: # Again (Forgot)
                new_stability = cls.update_stability_forget(card["stability"], card["difficulty"], retrievability)
                new_difficulty = cls.update_difficulty(card["difficulty"], rating)
            else: # Recalled
                new_stability = cls.update_stability_recall(card["stability"], card["difficulty"], retrievability, rating)
                new_difficulty = cls.update_difficulty(card["difficulty"], rating)
        
        interval = cls.next_interval(new_stability)
        scheduled_at = now + datetime.timedelta(days=interval)
        
        return {
            "stability": round(new_stability, 2),
            "difficulty": round(new_difficulty, 2),
            "scheduled_at": scheduled_at.isoformat(),
            "last_reviewed_at": now.isoformat(),
            "reps": card["reps"] + 1,
            "lapses": card["lapses"] + (1 if rating == 1 else 0),
            "interval": interval,
            "elapsed_days": elapsed_days
        }

class VocabPracticeReq(BaseModel):
    word_ids: List[int]

class VocabPracticeComplete(BaseModel):
    results: List[dict] # {word_id, correct, rating: optional 1-4}

class GrammarPracticeReq(BaseModel):
    rule_ids: List[int]
    difficulty: str = "Medium"

class ExamSaveReq(BaseModel):
    test_type: str
    title: str
    exam_data: dict
    score: Optional[int] = 0
    max_score: Optional[int] = 0
    completed: bool = False
    user_answers: Optional[dict] = None
    feedback: Optional[dict] = None
    skill: Optional[str] = None
    time_spent: Optional[int] = None

router = APIRouter(prefix="/student", tags=["Student"])


def _get_current_student(authorization: str = Header(...)):
    """Extract student from JWT token. Raises 401/403 if invalid."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization[7:]
    payload = auth_service.verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    conn = get_db()
    cursor = conn.execute("SELECT id, name, email, role, credits_ai, points, target_goal, current_level FROM users WHERE id = ?", (payload["user_id"],))
    user = cursor.fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user["role"] not in ("STUDENT", "ADMIN"):
        raise HTTPException(status_code=403, detail="Student access required")
    return dict(user)


def _check_usage_limit(user_id: int, feature: str, limit: int = 50):
    """Check if user has exceeded usage limit for a feature. Returns remaining uses."""
    conn = get_db()
    try:
        # Create table if not exists
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                feature VARCHAR(50) NOT NULL,
                count INTEGER DEFAULT 0,
                reset_date DATE DEFAULT CURRENT_DATE,
                UNIQUE(user_id, feature)
            )
        """)
        # Reset daily
        conn.execute("UPDATE user_usage SET count = 0 WHERE reset_date < CURRENT_DATE")
        # Get current count
        cursor = conn.execute("SELECT count FROM user_usage WHERE user_id = ? AND feature = ?", (user_id, feature))
        row = cursor.fetchone()
        current_count = row["count"] if row else 0
        if current_count >= limit:
            conn.close()
            raise HTTPException(status_code=429, detail=f"Usage limit exceeded for {feature}. Limit: {limit} per day.")
        # Increment count
        conn.execute("""
            INSERT OR REPLACE INTO user_usage (user_id, feature, count, reset_date)
            VALUES (?, ?, ?, CURRENT_DATE)
        """, (user_id, feature, current_count + 1))
        conn.commit()
        conn.close()
        return limit - current_count - 1
    except Exception as e:
        if conn:
            try: conn.close()
            except: pass
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail="Usage check error")


# ─── STATS ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def student_stats(authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()

    # Classes enrolled
    classes_count = conn.execute(
        "SELECT COUNT(*) FROM enrollments WHERE student_id = ?", (student["id"],)
    ).fetchone()[0]

    # Assignments for enrolled classes
    assignments_total = conn.execute(
        """SELECT COUNT(*) FROM assignments a
           JOIN enrollments e ON a.class_id = e.class_id
           WHERE e.student_id = ?""",
        (student["id"],)
    ).fetchone()[0]

    # Submitted scores
    scores_row = conn.execute(
        """SELECT COUNT(*), COALESCE(SUM(score),0), COALESCE(SUM(max_score),0)
           FROM student_scores WHERE student_id = ?""",
        (student["id"],)
    ).fetchone()
    submitted_count = scores_row[0]
    total_score = scores_row[1]
    total_max = scores_row[2]
    avg_percent = round(total_score / total_max * 100, 1) if total_max > 0 else 0

    # Vocabulary & Spaced Repetition
    vocab_row = conn.execute(
        "SELECT COUNT(*) FROM saved_vocabulary WHERE user_id = ?", (student["id"],)
    ).fetchone()
    vocab_count = vocab_row[0] if vocab_row else 0
    
    # Review needed: scheduled_at is NULL (new word) OR <= CURRENT_TIMESTAMP
    review_needed_row = conn.execute(
        """SELECT COUNT(*) FROM saved_vocabulary 
           WHERE user_id = ? AND (scheduled_at IS NULL OR datetime(scheduled_at) <= CURRENT_TIMESTAMP)""",
        (student["id"],)
    ).fetchone()
    review_needed_count = review_needed_row[0] if review_needed_row else 0

    assignments_pending = assignments_total - submitted_count
    conn.close()
    return {
        "classes_enrolled": classes_count,
        "assignments_total": assignments_total,
        "assignments_submitted": submitted_count,
        "assignments_pending": max(assignments_pending, 0),
        "total_score": total_score,
        "total_max_score": total_max,
        "average_percent": avg_percent,
        "vocab_count": vocab_count,
        "review_needed": review_needed_count,
        "points": student.get("points", 0),
        "credits_ai": student.get("credits_ai", 0)
    }

import time
_ranking_cache = {"data": None, "timestamp": 0}

@router.get("/ranking")
def get_ranking(authorization: str = Header(...)):
    """Get global student leaderboard."""
    _get_current_student(authorization) # Ensure auth
    
    # Return cache if less than 60 seconds old
    if _ranking_cache["data"] is not None and time.time() - _ranking_cache["timestamp"] < 60:
        return _ranking_cache["data"]

    conn = get_db()
    try:
        cursor = conn.execute(
            "SELECT name, points FROM users WHERE role = 'STUDENT' ORDER BY points DESC LIMIT 100"
        )
        ranking = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        # Update cache
        _ranking_cache["data"] = ranking
        _ranking_cache["timestamp"] = time.time()
        
        return ranking
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vocabulary/practice")
async def start_vocab_practice(req: VocabPracticeReq, authorization: str = Header(...)):
    student = _get_current_student(authorization)
    if student.get("credits_ai", 0) < 5:
        raise HTTPException(status_code=402, detail="Insufficient AI credits (5 required)")
    
    try:
        # Fetch words from database
        if not req.word_ids:
            # FSRS-based: select words never reviewed (scheduled_at IS NULL) OR due now
            conn = get_db()
            cursor = conn.execute(
                """SELECT id, word, meaning_en, meaning_vn FROM saved_vocabulary 
                   WHERE user_id = ? AND (scheduled_at IS NULL OR datetime(scheduled_at) <= CURRENT_TIMESTAMP)
                   ORDER BY stability ASC LIMIT 10""",
                (student["id"],)
            )
            words = [dict(row) for row in cursor.fetchall()]
            conn.close()
        else:
            conn = get_db()
            placeholders = ', '.join(['?'] * len(req.word_ids))
            cursor = conn.execute(
                f"SELECT id, word, meaning_en, meaning_vn FROM saved_vocabulary WHERE user_id = ? AND id IN ({placeholders})",
                (student["id"], *req.word_ids)
            )
            words = [dict(row) for row in cursor.fetchall()]
            conn.close()
        
        if not words:
            # Fallback: if no words need review, just take the 10 oldest ones
            conn = get_db()
            cursor = conn.execute(
                "SELECT id, word, meaning_en, meaning_vn FROM saved_vocabulary WHERE user_id = ? ORDER BY last_reviewed_at ASC LIMIT 10",
                (student["id"],)
            )
            words = [dict(row) for row in cursor.fetchall()]
            conn.close()

        if not words:
            raise HTTPException(status_code=404, detail="No words found. Save some vocabulary first!")
            
        result = await llm_service.generate_vocab_practice_rich(words)
        
        if result and isinstance(result, dict) and (result.get("exercises") or result.get("quiz")):
            # Deduct credits only on success with safety check
            conn = get_db()
            conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 5) WHERE id = ?", (student["id"],))
            conn.commit()
            conn.close()
            return result
            
        return {"error": "Failed to generate practice", "detail": "AI service returned no valid exercises."}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vocabulary/quiz/generate")
async def generate_quiz_async(req: dict, authorization: str = Header(...)):
    """Generate IELTS-style quiz from provided text."""
    student = _get_current_student(authorization)
    text = req.get("text")
    num = req.get("num", 5)
    
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
        
    _check_usage_limit(student["id"], "quiz_gen", limit=10)
    
    try:
        # Assuming we have an async version or can wrap it
        result = await llm_service.generate_exercises_from_text(text, "quiz", num)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vocabulary/quiz-error")
async def handle_quiz_error(req: dict, authorization: str = Header(...)):
    """Automated bridge: save a word/phrase that the student got wrong in a quiz."""
    student = _get_current_student(authorization)
    word = req.get("word")
    context = req.get("context", "")
    
    if not word:
        raise HTTPException(status_code=400, detail="Word is required")
    
    conn = get_db()
    try:
        # 1. Check if word already exists for this user
        cursor = conn.execute(
            "SELECT id FROM saved_vocabulary WHERE user_id = ? AND word = ?",
            (student["id"], word.lower())
        )
        existing = cursor.fetchone()
        
        if existing:
            # If it exists, we just 'reset' its stability to encourage immediate re-learning via FSRS
            # This effectively treats it as a 'lapse' during a quiz
            conn.execute(
                """UPDATE saved_vocabulary 
                   SET stability = 0.5, difficulty = 5.0, scheduled_at = CURRENT_TIMESTAMP,
                       lapses = lapses + 1
                   WHERE id = ?""",
                (existing["id"],)
            )
            message = f"Cập nhật trạng thái SRS cho '{word}'"
        else:
            # 2. If it's a new word, fetch content from AI and save
            content = await llm_service.generate_flashcard_content(word)
            conn.execute(
                """INSERT INTO saved_vocabulary 
                   (user_id, word, phonetic, pos, meaning_en, meaning_vn, example, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (student["id"], word, content.get("phonetic"), content.get("pos"), 
                 content.get("definition"), content.get("meaning_vn"), 
                 context or content.get("example"), "quiz-error")
            )
            message = f"Ghi nhớ từ mới '{word}' từ Quiz"
        
        conn.commit()
        conn.close()
        return {"status": "success", "message": message}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vocabulary/practice/complete")
def complete_vocab_practice(req: VocabPracticeComplete, authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()
    try:
        points_earned = 0
        # Wrap everything in a single transaction for significant speedup and consistency
        # In SQLite, conn.execute("BEGIN") and conn.commit() or using 'with conn:' handles this.
        conn.execute("BEGIN TRANSACTION")
        
        # Batch fetch all relevant words for this student to minimize SELECT calls
        word_ids = [res.get("word_id") for res in req.results if res.get("word_id")]
        if not word_ids:
            return {"status": "success", "message": "No words to update"}
            
        placeholders = ",".join(["?"] * len(word_ids))
        cursor = conn.execute(
            f"SELECT id, stability, difficulty, reps, lapses, last_reviewed_at FROM saved_vocabulary WHERE id IN ({placeholders}) AND user_id = ?",
            (*word_ids, student["id"])
        )
        # Create a lookup map for efficiency
        cards_map = {row["id"]: dict(row) for row in cursor.fetchall()}

        for res in req.results:
            word_id = res.get("word_id")
            if not word_id or word_id not in cards_map:
                continue
                
            correct = res.get("correct", False)
            rating = res.get("rating") # 1: Again, 2: Hard, 3: Good, 4: Easy
            
            if rating is None:
                rating = 3 if correct else 1

            card = cards_map[word_id]

            # 2. Calculate next state using FSRS
            card_dict = {
                "stability": card["stability"] or 0.0,
                "difficulty": card["difficulty"] or 0.0,
                "reps": card["reps"] or 0,
                "lapses": card["lapses"] or 0,
                "last_reviewed_at": card["last_reviewed_at"]
            }
            
            updated = FSRS.update_card(card_dict, rating)

            # 3. Update saved_vocabulary
            conn.execute(
                """UPDATE saved_vocabulary 
                   SET stability = ?, difficulty = ?, scheduled_at = ?, 
                       last_reviewed_at = ?, reps = ?, lapses = ?,
                       review_count = review_count + 1
                   WHERE id = ?""",
                (updated["stability"], updated["difficulty"], updated["scheduled_at"],
                 updated["last_reviewed_at"], updated["reps"], updated["lapses"], word_id)
            )

            # 4. Log the review
            conn.execute(
                """INSERT INTO study_logs 
                   (user_id, word_id, rating, stability, difficulty, elapsed_days, scheduled_days)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (student["id"], word_id, rating, updated["stability"], 
                 updated["difficulty"], updated["elapsed_days"], updated["interval"])
            )

            if correct:
                points_earned += 10
        
        # Award points
        conn.execute("UPDATE users SET points = points + ? WHERE id = ?", (points_earned, student["id"]))
        conn.execute("COMMIT")
        
        conn.close()
        return {
            "status": "success",
            "message": "Practice results saved with FSRS scheduler", 
            "points_earned": points_earned
        }
    except Exception as e:
        if conn: 
            try: conn.execute("ROLLBACK")
            except: pass
            conn.close()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/grammar/practice")
async def start_grammar_practice(req: GrammarPracticeReq, authorization: str = Header(...)):
    student = _get_current_student(authorization)
    if student.get("credits_ai", 0) < 5:
        raise HTTPException(status_code=402, detail="Insufficient AI credits (5 required)")
        
    try:
        placeholders = ', '.join(['?'] * len(req.rule_ids))
        conn = get_db()
        cursor = conn.execute(
            f"SELECT name FROM grammar_rules WHERE id IN ({placeholders})",
            tuple(req.rule_ids)
        )
        rule_names = [row["name"] for row in cursor.fetchall()]
        conn.close()
        
        if not rule_names:
            raise HTTPException(status_code=404, detail="Rules not found")
            
        result = await llm_service.generate_grammar_practice(rule_names, req.difficulty)
        
        if result and isinstance(result, list) and len(result) > 0:
            # Deduct credits only on success
            conn = get_db()
            conn.execute("UPDATE users SET credits_ai = credits_ai - 5 WHERE id = ?", (student["id"],))
            conn.commit()
            conn.close()
            return result
            
        return {"error": "Failed to generate grammar practice", "detail": result.get("error") if isinstance(result, dict) else "Unknown error"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exams/save")
def save_exam(req: ExamSaveReq, authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()
    try:
        exam_data_json = json.dumps(req.exam_data, ensure_ascii=False)
        user_answers_json = json.dumps(req.user_answers, ensure_ascii=False) if req.user_answers else None
        feedback_json = json.dumps(req.feedback, ensure_ascii=False) if req.feedback else None
        
        conn.execute(
            """INSERT INTO generated_exams (user_id, test_type, title, exam_data, score, max_score, completed, user_answers, feedback, skill, time_spent)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (student["id"], req.test_type, req.title, exam_data_json, req.score, req.max_score, 
             1 if req.completed else 0, user_answers_json, feedback_json, req.skill, req.time_spent)
        )
        # Award points proportionally based on score
        if req.completed and req.max_score and req.max_score > 0:
            points = int((req.score / req.max_score) * 100)
            conn.execute("UPDATE users SET points = points + ? WHERE id = ?", (points, student["id"]))
            
        conn.commit()
        conn.close()
        return {"message": "Exam saved successfully", "points_earned": int((req.score / req.max_score) * 100) if req.max_score else 0}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/exams")
def list_exams(authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()
    try:
        cursor = conn.execute(
            "SELECT id, test_type, title, score, max_score, completed, skill, time_spent, created_at FROM generated_exams WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (student["id"],)
        )
        exams = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return exams
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/exams/{exam_id}")
def get_exam_detail(exam_id: int, authorization: str = Header(...)):
    """Get full exam detail for review (questions, user answers, feedback)."""
    student = _get_current_student(authorization)
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM generated_exams WHERE id = ? AND user_id = ?",
            (exam_id, student["id"])
        ).fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="Exam not found")
        result = dict(row)
        # Parse JSON blobs
        for key in ["exam_data", "user_answers", "feedback"]:
            if result.get(key) and isinstance(result[key], str):
                try:
                    result[key] = json.loads(result[key])
                except: pass
        return result
    except HTTPException:
        raise
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))


# ─── MY CLASSES ───────────────────────────────────────────────────────────────

@router.get("/my-classes")
def my_classes(authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()
    rows = conn.execute(
        """SELECT c.id, c.name, c.teacher_name, c.students_count,
                  e.enrolled_at,
                  (SELECT COUNT(*) FROM lessons l WHERE l.class_id = c.id) as lesson_count,
                  (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id) as assignment_count
           FROM enrollments e
           JOIN classes c ON e.class_id = c.id
           WHERE e.student_id = ?
           ORDER BY e.enrolled_at DESC""",
        (student["id"],)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─── LESSONS FOR A CLASS ─────────────────────────────────────────────────────

@router.get("/my-classes/{class_id}/lessons")
def class_lessons(class_id: int, authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()

    # Verify enrollment
    enrolled = conn.execute(
        "SELECT id FROM enrollments WHERE student_id = ? AND class_id = ?",
        (student["id"], class_id)
    ).fetchone()
    if not enrolled:
        conn.close()
        raise HTTPException(status_code=403, detail="You are not enrolled in this class")

    lessons = conn.execute(
        """SELECT id, class_id, title, content, file_name
           FROM lessons WHERE class_id = ?
           ORDER BY id""",
        (class_id,)
    ).fetchall()
    conn.close()
    return [dict(l) for l in lessons]


# ─── ASSIGNMENTS ──────────────────────────────────────────────────────────────

@router.get("/assignments")
def my_assignments(authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()
    rows = conn.execute(
        """SELECT a.id, a.title, a.description, a.type, a.due_date, a.created_at, a.skill_type, a.bloom_level,
                  c.name as class_name,
                  ss.score, ss.max_score, ss.submitted_at
           FROM assignments a
           JOIN enrollments e ON a.class_id = e.class_id
           JOIN classes c ON a.class_id = c.id
           LEFT JOIN student_scores ss ON ss.assignment_id = a.id AND ss.student_id = ?
           WHERE e.student_id = ?
           ORDER BY a.created_at DESC""",
        (student["id"], student["id"])
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/assignments/{assignment_id}")
def get_assignment_detail(assignment_id: int, authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()

    row = conn.execute(
        """SELECT a.id, a.title, a.description, a.type, a.quiz_data, a.due_date, a.created_at, a.skill_type, a.bloom_level,
                  c.name as class_name
           FROM assignments a
           JOIN enrollments e ON a.class_id = e.class_id
           JOIN classes c ON a.class_id = c.id
           WHERE a.id = ? AND e.student_id = ?""",
        (assignment_id, student["id"])
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Assignment not found or not accessible")

    # Check if already submitted
    score_row = conn.execute(
        "SELECT score, max_score, submitted_at, submission_text, bloom_evaluation FROM student_scores WHERE student_id = ? AND assignment_id = ?",
        (student["id"], assignment_id)
    ).fetchone()
    conn.close()

    result = dict(row)
    if result.get("quiz_data"):
        result["quiz_data"] = json.loads(result["quiz_data"])
    result["submitted"] = score_row is not None
    if score_row:
        result["score"] = score_row["score"]
        result["max_score"] = score_row["max_score"]
        result["submitted_at"] = score_row["submitted_at"]
        result["submission_text"] = score_row["submission_text"]
        if score_row["bloom_evaluation"]:
            try:
                result["evaluation"] = json.loads(score_row["bloom_evaluation"])
            except:
                result["evaluation"] = score_row["bloom_evaluation"]
    return result


from typing import Union

class QuizSubmission(BaseModel):
    answers: Optional[dict] = None  # {question_index: selected_answer}

class TextSubmission(BaseModel):
    text: Optional[str] = None


@router.post("/assignments/{assignment_id}/submit")
async def submit_assignment(assignment_id: int, submission: Union[QuizSubmission, TextSubmission], authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()

    # Get assignment with enrollment check
    row = conn.execute(
        """SELECT a.id, a.type, a.quiz_data, a.description, a.title
           FROM assignments a
           JOIN enrollments e ON a.class_id = e.class_id
           WHERE a.id = ? AND e.student_id = ?""",
        (assignment_id, student["id"])
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment_type = row["type"]

    # Check if already submitted
    existing = conn.execute(
        "SELECT id FROM student_scores WHERE student_id = ? AND assignment_id = ?",
        (student["id"], assignment_id)
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Already submitted")

    if assignment_type == "quiz":
        # Grade the quiz
        if not submission.answers:
            conn.close()
            raise HTTPException(status_code=400, detail="Answers required for quiz")
        quiz_data = json.loads(row["quiz_data"]) if row["quiz_data"] else []
        score = 0
        max_score = len(quiz_data)
        details = []

        for i, q in enumerate(quiz_data):
            student_answer = submission.answers.get(str(i))
            correct = q.get("correct_answer") or q.get("answer")
            is_correct = student_answer == correct
            if is_correct:
                score += 1
            details.append({
                "question": q.get("question", ""),
                "student_answer": student_answer,
                "correct_answer": correct,
                "is_correct": is_correct,
            })

        conn.execute(
            "INSERT INTO student_scores (student_id, assignment_id, score, max_score, submission_text) VALUES (?, ?, ?, ?, ?)",
            (student["id"], assignment_id, score, max_score, None)
        )
        conn.commit()
        conn.close()

        return {
            "score": score,
            "max_score": max_score,
            "percent": round(score / max_score * 100, 1) if max_score > 0 else 0,
            "details": details,
        }
    elif assignment_type == "writing":
        # Grade the writing assignment using LLM
        if not submission.text:
            conn.close()
            raise HTTPException(status_code=400, detail="Text required for writing assignment")
            
        prompt_text = row["title"] + "\\n" + (row["description"] or "")
        
        # Assume IELTS by default, unless title suggests otherwise
        test_type = "TOEIC" if "toeic" in row["title"].lower() else "IELTS"
        
        try:
            evaluation = await llm_service.grade_writing_assignment(prompt_text, submission.text, test_type)
            
            score = 0
            max_score = 9 if test_type == "IELTS" else 100 # arbitrary max scaling
            
            if not evaluation.get("error"):
                score = float(evaluation.get("score", 0))
                # For TOEIC it might be out of 200, but let's just use what the LLM gives
                
            conn.execute(
                "INSERT INTO student_scores (student_id, assignment_id, score, max_score, submission_text, bloom_evaluation) VALUES (?, ?, ?, ?, ?, ?)",
                (student["id"], assignment_id, score, max_score, submission.text, json.dumps(evaluation, ensure_ascii=False))
            )
            conn.commit()
            conn.close()
            return {"message": "Writing submitted successfully", "evaluation": evaluation}
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=500, detail=f"Error grading writing: {str(e)}")
    else:
        conn.close()
        raise HTTPException(status_code=400, detail="Unsupported assignment type")


# ─── SCORES ───────────────────────────────────────────────────────────────────

@router.get("/scores")
def my_scores(authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()
    rows = conn.execute(
        """SELECT ss.id, ss.score, ss.max_score, ss.submitted_at,
                  a.title as assignment_title, c.name as class_name
           FROM student_scores ss
           JOIN assignments a ON ss.assignment_id = a.id
           JOIN classes c ON a.class_id = c.id
           WHERE ss.student_id = ?
           ORDER BY ss.submitted_at DESC""",
        (student["id"],)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─── AI TEXT ANALYSIS ─────────────────────────────────────────────────────────

class TextAnalysisRequest(BaseModel):
    text: str
    num_questions: int = 5


@router.post("/analyze-text")
async def analyze_text(req: TextAnalysisRequest, authorization: str = Header(...)):
    user = _get_current_student(authorization)
    if user.get("credits_ai", 0) < 5:
        raise HTTPException(status_code=402, detail="Insufficient AI credits (5 required)")
    
    _check_usage_limit(user["id"], "ai-tools")
    
    result = await llm_service.generate_exercises_from_text(req.text, "mixed", req.num_questions)
    
    if result and isinstance(result, dict) and "error" not in result:
        # Deduct credits only on success
        conn = get_db()
        conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 5) WHERE id = ?", (user["id"],))
        conn.commit()
        conn.close()
        return result
        
    return {"error": "Failed to analyze text", "detail": result.get("error") if isinstance(result, dict) else "Unknown error"}


# ─── DICTIONARY LOOKUP ────────────────────────────────────────────────────────

class DictionaryRequest(BaseModel):
    word: str


@router.post("/dictionary/lookup")
async def dictionary_lookup(req: DictionaryRequest, authorization: str = Header(...), background_tasks: BackgroundTasks = None):
    """
    Hybrid dictionary lookup with completeness validation and STREAMING:
    1. DB cache (only if data is COMPLETE — all fields filled)
    2. Neo4j cache fallback (for Render ephemeral restarts)
    3. AI lookup stream if missing or incomplete
    4. Save to DB + Neo4j asynchronously
    
    Case-sensitive: "IT" and "it" are treated as different words.
    """
    from fastapi.responses import StreamingResponse
    from ..services.llm_service import is_data_complete, lookup_dictionary_stream, lookup_free_dictionary
    import json
    import asyncio
    
    user = _get_current_student(authorization)
    user_id = user["id"]
    
    word_original = req.word.strip()
    word_lower = word_original.lower()
    
    if not word_original or len(word_original) > 100:
        raise HTTPException(status_code=400, detail="Invalid word")

    is_abbreviation = word_original.isupper() and len(word_original) >= 2
    lookup_key = word_original if is_abbreviation else word_lower

    async def check_local_cache():
        loop = asyncio.get_event_loop()
        def _get():
            conn = get_db()
            try:
                return conn.execute(
                    "SELECT data_json, meanings_count, word_original FROM dictionary_cache WHERE word = ?",
                    (lookup_key,)
                ).fetchone()
            finally:
                conn.close()
        return await loop.run_in_executor(None, _get)

    async def check_neo4j():
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, graph_service.get_dictionary_cache, lookup_key)

    async def check_free_dict():
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lookup_free_dictionary, lookup_key)

    # 1) Parallel Lookup
    cache_task = asyncio.create_task(check_local_cache())
    local_row = await cache_task

    # 1.1) Fast Exit on local cache hit
    if local_row:
        cached = json.loads(local_row["data_json"])
        if is_data_complete(cached):
            cached["_source"] = "database"
            # Enrich with graph connections
            connections = graph_service.get_word_connections(word_lower)
            cached["graph_connections"] = connections.get("connections", [])
            # Check saved status
            conn = get_db()
            cursor = conn.execute("SELECT id FROM saved_vocabulary WHERE user_id = ? AND word = ?", (user_id, lookup_key))
            cached["is_saved"] = cursor.fetchone() is not None
            conn.close()
            return cached

    # 2) Fallback Parallel Lookup (Rest of caches)
    neo4j_task = asyncio.create_task(check_neo4j())
    free_dict_task = asyncio.create_task(check_free_dict())
    
    neo4j_data, free_data = await asyncio.gather(neo4j_task, free_dict_task)
    wikipedia_data = None  # Initialize to avoid NameError

    # 2.1) Process Results (Neo4j and other caches)
    result_to_return = None
    source = ""
    
    if neo4j_data and is_data_complete(neo4j_data):
        result_to_return = neo4j_data
        source = "database_neo4j_restored"
        # Async restore to SQLite
        def _sync_restore():
            c = get_db()
            try:
                c.execute(
                    "INSERT OR REPLACE INTO dictionary_cache (word, word_original, data_json, meanings_count) VALUES (?, ?, ?, ?)",
                    (lookup_key, word_original, json.dumps(neo4j_data, ensure_ascii=False), len(neo4j_data.get("meanings", [])))
                )
                c.commit()
            finally: c.close()
        if background_tasks: background_tasks.add_task(_sync_restore)

    if result_to_return:
        result_to_return["_source"] = source
        # Enrich with graph connections
        connections = graph_service.get_word_connections(word_lower)
        result_to_return["graph_connections"] = connections.get("connections", [])
        
        # Check saved status
        conn = get_db()
        cursor = conn.execute("SELECT id FROM saved_vocabulary WHERE user_id = ? AND word = ?", (user_id, lookup_key))
        result_to_return["is_saved"] = cursor.fetchone() is not None
        conn.close()
        return result_to_return

    # 3) Fallback or Stream if no complete data found
    llm = llm_service.get_llm()
    if not llm:
        if local_row:
            cached = json.loads(local_row["data_json"])
            cached["_source"] = "database_partial"
            return cached
        if neo4j_data:
            neo4j_data["_source"] = "database_neo4j_fallback"
            return neo4j_data
        raise HTTPException(status_code=503, detail="LLM service unavailable")
    
    # We will use StreamingResponse to stream the AI output to the client.
    # 3) Save to SQLite + Neo4j asynchronously AFTER the stream finishes successfully
    def _save_to_db_and_neo4j(key, original, data):
        # Save to SQLite dictionary_cache
        try:
            mc = len(data.get("meanings", []))
            c = get_db()
            try:
                c.execute(
                    """INSERT INTO dictionary_cache (word, word_original, data_json, meanings_count)
                       VALUES (?, ?, ?, ?)
                       ON CONFLICT(word) DO UPDATE SET
                       data_json=excluded.data_json,
                       word_original=excluded.word_original,
                       meanings_count=excluded.meanings_count,
                       updated_at=CURRENT_TIMESTAMP""",
                    (key, original, json.dumps(data, ensure_ascii=False), mc)
                )
                c.commit()
            finally:
                c.close()
            print(f"[DB SAVE] dictionary_cache success for: {key}")
        except Exception as e:
            print(f"[DB SAVE] dictionary_cache error: {e}")

        # Save meanings to Neo4j
        try:
            all_synonyms = []
            all_antonyms = []
            primary_meaning_en = ""
            primary_meaning_vn = ""
            primary_pos = data.get("pos", "")
            
            for i, meaning in enumerate(data.get("meanings", [])):
                if i == 0:
                    primary_meaning_en = meaning.get("definition_en", "")
                    primary_meaning_vn = meaning.get("definition_vn", "")
                    primary_pos = meaning.get("pos", primary_pos)
                all_synonyms.extend(meaning.get("synonyms", []))
                all_antonyms.extend(meaning.get("antonyms", []))
            
            graph_service.save_word_to_graph({
                "word": key.lower(),
                "phonetic": data.get("phonetic_uk", ""),
                "audio_url": data.get("audio_url", ""),
                "pos": primary_pos,
                "meaning_en": primary_meaning_en,
                "meaning_vn": primary_meaning_vn,
                "example": (data.get("meanings", [{}])[0].get("examples") or [""])[0].split("|")[0] if data.get("meanings") else "",
                "level": data.get("level", "B1"),
                "word_family": data.get("word_family", []),
                "collocations": data.get("collocations", []),
                "idioms": data.get("idioms", []),
                "synonyms": list(set(all_synonyms))[:5],
                "antonyms": list(set(all_antonyms))[:3],
            })
            
            # Save full raw JSON to Neo4j for persistent caching
            graph_service.set_dictionary_cache(key.lower(), data)
        except Exception as e:
            print(f"[Neo4j SAVE] error: {e}")

    # We will use StreamingResponse to stream the AI output to the client.
    async def stream_generator():
        try:
            # CHECK SAVED STATUS ONCE AT START
            cursor = get_db().execute("SELECT id FROM saved_vocabulary WHERE user_id = ? AND word = ?", (user_id, lookup_key))
            is_saved = cursor.fetchone() is not None
            
            final_result_data = None
            
            async for chunk in llm_service.lookup_dictionary_stream(lookup_key, free_data=free_data, wikipedia_data=wikipedia_data):
                if not chunk: continue
                # We can inject is_saved into result chunks
                if '"status": "result"' in chunk:
                    try:
                        data = json.loads(chunk)
                        data["is_saved"] = is_saved
                        final_result_data = data # Capture the latest complete result
                        chunk = json.dumps(data, ensure_ascii=False)
                    except: pass
                
                yield f"data: {chunk}\n\n"
            
            # Save final parsed result if valid and complete
            if final_result_data and is_data_complete(final_result_data):
                if background_tasks:
                    background_tasks.add_task(_save_to_db_and_neo4j, lookup_key, word_original, final_result_data)
                else:
                    _save_to_db_and_neo4j(lookup_key, word_original, final_result_data)
            else:
                print(f"[STREAM] No complete final_result_data to save for '{lookup_key}'")

        except Exception as e:
            print(f"Dictionary STREAM error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")


# ─── SAVED VOCABULARY ─────────────────────────────────────────────────────────

class SaveVocabRequest(BaseModel):
    word: str
    phonetic: str = ""
    audio_url: str = ""
    pos: str = ""
    meaning_en: str = ""
    meaning_vn: str = ""
    example: str = ""
    level: str = "B1"
    source: str = "dictionary"


@router.post("/vocabulary/save")
def save_vocabulary(req: SaveVocabRequest, authorization: str = Header(...)):
    """Save a word to personal vocabulary list + Neo4j graph."""
    student = _get_current_student(authorization)
    word = req.word.strip().lower()
    if not word or len(word) > 100:
        raise HTTPException(status_code=400, detail="Invalid word")

    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO saved_vocabulary (user_id, word, phonetic, audio_url, pos, meaning_en, meaning_vn, example, level, source)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(user_id, word, pos) DO UPDATE SET
                   phonetic=excluded.phonetic,
                   audio_url=excluded.audio_url,
                   meaning_en=excluded.meaning_en, meaning_vn=excluded.meaning_vn,
                   example=excluded.example, level=excluded.level, source=excluded.source""",
            (student["id"], word, req.phonetic, req.audio_url, req.pos, req.meaning_en, req.meaning_vn, req.example, req.level, req.source)
        )
        conn.commit()
    finally:
        conn.close()

    # Also save to Neo4j knowledge graph
    graph_service.save_word_to_graph({
        "word": word, "phonetic": req.phonetic, "audio_url": req.audio_url, "pos": req.pos,
        "meaning_en": req.meaning_en, "meaning_vn": req.meaning_vn,
        "example": req.example, "level": req.level,
    })

    return {"status": "saved", "word": word}


@router.get("/vocabulary")
def list_vocabulary(
    authorization: str = Header(...),
    search: str = "",
    level: str = "",
):
    """List saved vocabulary with optional filters."""
    student = _get_current_student(authorization)
    conn = get_db()
    query = "SELECT * FROM saved_vocabulary WHERE user_id = ?"
    params: list = [student["id"]]

    if search:
        query += " AND (word LIKE ? OR meaning_vn LIKE ? OR meaning_en LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])
    if level:
        query += " AND level = ?"
        params.append(level)

    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, tuple(params)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.delete("/vocabulary/{vocab_id}")
def delete_vocabulary(vocab_id: int, authorization: str = Header(...)):
    """Delete a saved word."""
    student = _get_current_student(authorization)
    conn = get_db()
    row = conn.execute(
        "SELECT id FROM saved_vocabulary WHERE id = ? AND user_id = ?",
        (vocab_id, student["id"])
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Word not found")
    conn.execute("DELETE FROM saved_vocabulary WHERE id = ?", (vocab_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@router.put("/vocabulary/{vocab_id}")
def update_vocabulary(vocab_id: int, req: SaveVocabRequest, authorization: str = Header(...)):
    """Update an existing saved word."""
    student = _get_current_student(authorization)
    conn = get_db()
    row = conn.execute(
        "SELECT id FROM saved_vocabulary WHERE id = ? AND user_id = ?",
        (vocab_id, student["id"])
    ).fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Word not found")
        
    conn.execute(
        """UPDATE saved_vocabulary 
           SET phonetic=?, audio_url=?, pos=?, meaning_en=?, meaning_vn=?, example=?, level=?
           WHERE id = ?""",
        (req.phonetic, req.audio_url, req.pos, req.meaning_en, req.meaning_vn, req.example, req.level, vocab_id)
    )
    conn.commit()
    conn.close()
    return {"status": "updated"}


class BulkVocabSync(BaseModel):
    words: List[SaveVocabRequest]

@router.post("/vocabulary/sync")
def sync_vocabulary(data: BulkVocabSync, authorization: str = Header(...)):
    """Bulk sync vocabulary from localStorage backup. Upserts all words."""
    student = _get_current_student(authorization)
    synced = 0
    conn = get_db()
    try:
        for req in data.words:
            word = req.word.strip().lower()
            if not word or len(word) > 100:
                continue
            conn.execute(
                """INSERT INTO saved_vocabulary (user_id, word, phonetic, audio_url, pos, meaning_en, meaning_vn, example, level, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(user_id, word, pos) DO UPDATE SET
                       phonetic=excluded.phonetic,
                       audio_url=excluded.audio_url,
                       meaning_en=excluded.meaning_en, meaning_vn=excluded.meaning_vn,
                       example=excluded.example, level=excluded.level, source=excluded.source""",
                (student["id"], word, req.phonetic, req.audio_url, req.pos, req.meaning_en, req.meaning_vn, req.example, req.level, req.source)
            )
            synced += 1
        conn.commit()
    finally:
        conn.close()
    return {"status": "synced", "count": synced}


# ─── PERSONALIZED ROADMAP ────────────────────────────────────────────────────

@router.get("/roadmap")
async def get_student_roadmap(authorization: str = Header(...), refresh: bool = Query(False)):
    """Generate or retrieve a personalized learning roadmap."""
    student = _get_current_student(authorization)
    user_id = student["id"]
    
    conn = get_db()
    
    # 1. Fetch current stats for "Progress Hash"
    vocab_count_row = conn.execute("SELECT COUNT(*) FROM saved_vocabulary WHERE user_id = ?", (user_id,)).fetchone()
    vocab_count = vocab_count_row[0] if vocab_count_row else 0
    points = student.get("points", 0)
    
    # Significant change hash: 
    # - New roadmap every 20 words
    # - Or every 500 points
    stats_hash = f"v{vocab_count // 20}_p{points // 500}"
    
    # 2. Check Cache (if not refreshing)
    if not refresh:
        cached_row = conn.execute(
            "SELECT roadmap_data, last_stats_hash FROM student_roadmaps WHERE user_id = ?", 
            (user_id,)
        ).fetchone()
        
        if cached_row:
            roadmap_data, last_hash = cached_row[0], cached_row[1]
            if last_hash == stats_hash:
                conn.close()
                try:
                    data = json.loads(roadmap_data)
                    data["_from_cache"] = True
                    data["user_stats"] = {
                        "vocab_count": vocab_count, 
                        "points": points,
                        "target_goal": student.get("target_goal"),
                        "current_level": student.get("current_level")
                    }
                    return data
                except:
                    pass # Fallback to AI if JSON is corrupt
            else:
                print(f"[ROADMAP] Progress detected ({last_hash} -> {stats_hash}). Regenerating...")

    # 3. Generate with AI
    # Fetch vocabulary for context
    vocab_rows = conn.execute(
        "SELECT word, meaning_en, level FROM saved_vocabulary WHERE user_id = ? LIMIT 30",
        (user_id,)
    ).fetchall()
    words = [dict(r) for r in vocab_rows]
    
    # Pass stats to user_info for AI to acknowledge
    student["vocab_count"] = vocab_count
    
    result = await llm_service.generate_personalized_roadmap(student, words)
    
    # 4. Save to Cache
    if result and "error" not in result:
        result["user_stats"] = {
            "vocab_count": vocab_count, 
            "points": points,
            "target_goal": student.get("target_goal"),
            "current_level": student.get("current_level")
        }
        conn.execute(
            "INSERT OR REPLACE INTO student_roadmaps (user_id, roadmap_data, last_stats_hash, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
            (user_id, json.dumps(result, ensure_ascii=False), stats_hash)
        )
        conn.commit()
    
    conn.close()
    return result

@router.get("/knowledge-graph")
def student_knowledge_graph(
    authorization: str = Header(...),
    topic: str = "all",
):
    """Get the student's vocabulary knowledge graph for visualization."""
    _get_current_student(authorization)
    return graph_service.get_knowledge_subgraph(topic)


# ─── PHASE 2 FEATURES: IPA, TOEIC/IELTS, 4 SKILLS ─────────────────────────────

class IpaRequest(BaseModel):
    words: Optional[List[str]] = None
    focus: str = "vowels"

@router.post("/ipa/generate")
async def generate_ipa(req: IpaRequest, authorization: str = Header(...)):
    user = _get_current_student(authorization)
    if user.get("credits_ai", 0) < 5:
        raise HTTPException(status_code=402, detail="Insufficient AI credits (5 required)")
    
    _check_usage_limit(user["id"], "ipa")
    
    result = await llm_service.generate_ipa_lesson(req.words, req.focus)
    
    if result and isinstance(result, dict) and "error" not in result:
        # Deduct credits only on success
        conn = get_db()
        conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 5) WHERE id = ?", (user["id"],))
        conn.commit()
        conn.close()
        return result
        
    return {"error": "Failed to generate IPA lesson", "detail": result.get("error") if isinstance(result, dict) else "Unknown error"}

class PracticeRequest(BaseModel):
    test_type: str = "TOEIC"
    skill: str = "reading"
    part: str = ""

@router.post("/practice/generate")
async def generate_practice(req: PracticeRequest, authorization: str = Header(...)):
    user = _get_current_student(authorization)
    if user.get("credits_ai", 0) < 5:
        raise HTTPException(status_code=402, detail="Insufficient AI credits (5 required)")
    _check_usage_limit(user["id"], f"practice_{req.test_type}")
    
    result = await llm_service.generate_practice_test(req.test_type, req.skill, req.part)
    
    if result and isinstance(result, dict) and "error" not in result:
        # Deduct credits only on success
        conn = get_db()
        conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 5) WHERE id = ?", (user["id"],))
        conn.commit()
        conn.close()
        return result
        
    return {"error": "Failed to generate practice test", "detail": result.get("error") if isinstance(result, dict) else "Unknown error"}

class ReadingRequest(BaseModel):
    topic: str = ""
    level: str = "B1"

@router.post("/reading/generate")
async def generate_reading(req: ReadingRequest, authorization: str = Header(...)):
    user = _get_current_student(authorization)
    if user.get("credits_ai", 0) < 5:
        raise HTTPException(status_code=402, detail="Insufficient AI credits (5 required)")
    _check_usage_limit(user["id"], "reading")
    
    result = await llm_service.generate_reading_passage(req.topic, req.level)
    
    if result and isinstance(result, dict) and "error" not in result:
        # Deduct credits only on success
        conn = get_db()
        conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 5) WHERE id = ?", (user["id"],))
        conn.commit()
        conn.close()
        return result
        
    return {"error": "Failed to generate reading passage", "detail": result.get("error") if isinstance(result, dict) else "Unknown error"}

class WritingRequest(BaseModel):
    text: str
    task_type: str = "essay"
    target_test: str = "IELTS"

@router.post("/writing/evaluate")
async def evaluate_writing(req: WritingRequest, authorization: str = Header(...)):
    user = _get_current_student(authorization)
    if user.get("credits_ai", 0) < 5:
        raise HTTPException(status_code=402, detail="Insufficient AI credits (5 required)")
    
    result = await llm_service.evaluate_writing(req.text, req.task_type, req.target_test)
    
    if result and isinstance(result, dict) and "error" not in result:
        # Deduct credits only on success
        conn = get_db()
        conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 5) WHERE id = ?", (user["id"],))
        conn.commit()
        conn.close()
        return result
        
    return {"error": "Failed to evaluate writing", "detail": result.get("error") if isinstance(result, dict) else "Unknown error"}

class SpeakingRequest(BaseModel):
    level: str = "B1"
    topic_type: str = "general"

@router.post("/speaking/topic")
async def generate_speaking(req: SpeakingRequest, authorization: str = Header(...)):
    user = _get_current_student(authorization)
    if user.get("credits_ai", 0) < 5:
        raise HTTPException(status_code=402, detail="Insufficient AI credits (5 required)")
    
    result = await llm_service.generate_speaking_topic(req.level, req.topic_type)
    
    if result and isinstance(result, dict) and "error" not in result:
        # Deduct credits only on success
        conn = get_db()
        conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 5) WHERE id = ?", (user["id"],))
        conn.commit()
        conn.close()
        return result
        
    return {"error": "Failed to generate speaking topic", "detail": result.get("error") if isinstance(result, dict) else "Unknown error"}


@router.post("/file/upload-analyze")
async def student_upload_analyze(
    file: UploadFile = File(...),
    exercise_type: str = Form("mixed"),
    num_questions: int = Form(5),
    authorization: str = Header(...)
):
    user = _get_current_student(authorization)
    if user.get("credits_ai", 0) < 5:
        raise HTTPException(status_code=402, detail="Insufficient AI credits (5 required)")

    if hasattr(file, 'size') and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")

    content = await file.read()
    text = file_service.extract_text_from_file(content, file.filename)
    
    if not text or len(text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    result = llm_service.generate_exercises_from_text(text, exercise_type, num_questions)
    
    if result and isinstance(result, dict) and "error" not in result:
        # Deduct credits only on success
        conn = get_db()
        conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 5) WHERE id = ?", (user["id"],))
        conn.commit()
        conn.close()
        return result
        
    return {"error": "Failed to analyze uploaded file", "detail": result.get("error") if isinstance(result, dict) else "Unknown error"}


# ─── GRAMMAR ────────────────────────────────────────────────────────────────

@router.get("/grammar")
def get_grammar_rules(authorization: str = Header(...)):
    _get_current_student(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT id, name, description, file_name, created_at FROM grammar_rules ORDER BY id DESC")
    results = cursor.fetchall()
    conn.close()
    return results

@router.get("/grammar/{rule_id}/file")
def get_grammar_file(rule_id: int):
    conn = get_db()
    cursor = conn.execute("SELECT file_name, file_data FROM grammar_rules WHERE id = ?", (rule_id,))
    row = cursor.fetchone()
    conn.close()
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_name = row[0]
    file_data = row[1]
    
    import mimetypes
    media_type, _ = mimetypes.guess_type(file_name)
    if not media_type:
        media_type = "application/octet-stream"
        
    return Response(content=file_data, media_type=media_type, headers={
        "Content-Disposition": f'inline; filename="{file_name}"'
    })

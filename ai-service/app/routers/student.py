from fastapi import APIRouter, HTTPException, Header, Query
from ..database import get_db
from ..services import auth_service, llm_service
from pydantic import BaseModel
from typing import Optional
import json

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
    cursor = conn.execute("SELECT id, name, email, role FROM users WHERE id = ?", (payload["user_id"],))
    user = cursor.fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user["role"] not in ("STUDENT", "ADMIN"):
        raise HTTPException(status_code=403, detail="Student access required")
    return dict(user)


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

    # Pending (not yet submitted)
    pending = assignments_total - submitted_count

    conn.close()
    return {
        "classes_enrolled": classes_count,
        "assignments_total": assignments_total,
        "assignments_submitted": submitted_count,
        "assignments_pending": max(pending, 0),
        "total_score": total_score,
        "total_max_score": total_max,
        "average_percent": avg_percent,
    }


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
        """SELECT a.id, a.title, a.description, a.due_date, a.created_at,
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
        """SELECT a.id, a.title, a.description, a.quiz_data, a.due_date, a.created_at,
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
        "SELECT score, max_score, submitted_at FROM student_scores WHERE student_id = ? AND assignment_id = ?",
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
    return result


class QuizSubmission(BaseModel):
    answers: dict  # {question_index: selected_answer}


@router.post("/assignments/{assignment_id}/submit")
def submit_assignment(assignment_id: int, submission: QuizSubmission, authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()

    # Get assignment with enrollment check
    row = conn.execute(
        """SELECT a.id, a.quiz_data
           FROM assignments a
           JOIN enrollments e ON a.class_id = e.class_id
           WHERE a.id = ? AND e.student_id = ?""",
        (assignment_id, student["id"])
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Check if already submitted
    existing = conn.execute(
        "SELECT id FROM student_scores WHERE student_id = ? AND assignment_id = ?",
        (student["id"], assignment_id)
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Already submitted")

    # Grade the quiz
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
        "INSERT INTO student_scores (student_id, assignment_id, score, max_score) VALUES (?, ?, ?, ?)",
        (student["id"], assignment_id, score, max_score)
    )
    conn.commit()
    conn.close()

    return {
        "score": score,
        "max_score": max_score,
        "percent": round(score / max_score * 100, 1) if max_score > 0 else 0,
        "details": details,
    }


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
def analyze_text(req: TextAnalysisRequest, authorization: str = Header(...)):
    _get_current_student(authorization)
    if not llm_service:
        raise HTTPException(status_code=503, detail="LLM service unavailable")
    vocab = llm_service.extract_vocabulary_from_text(req.text)
    quiz = llm_service.generate_quiz_from_text(req.text, req.num_questions)
    return {"vocabulary": vocab, "quiz": quiz}

from fastapi import APIRouter, HTTPException, Header, Query, UploadFile, File, Form, BackgroundTasks
from ..database import get_db
from ..services import auth_service, llm_service, graph_service, file_service
from pydantic import BaseModel
from typing import Optional, List
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
    llm = llm_service.get_llm()
    if not llm:
        raise HTTPException(status_code=503, detail="LLM service unavailable — configure API key in Admin settings")
    vocab = llm_service.extract_vocabulary_from_text(req.text)
    quiz = llm_service.generate_quiz_from_text(req.text, req.num_questions)
    return {"vocabulary": vocab, "quiz": quiz}


# ─── DICTIONARY LOOKUP ────────────────────────────────────────────────────────

class DictionaryRequest(BaseModel):
    word: str


@router.post("/dictionary/lookup")
def dictionary_lookup(req: DictionaryRequest, authorization: str = Header(...), background_tasks: BackgroundTasks = None):
    """
    Hybrid dictionary lookup with completeness validation and STREAMING:
    1. DB cache (only if data is COMPLETE — all fields filled)
    2. Neo4j cache fallback (for Render ephemeral restarts)
    3. AI lookup stream if missing or incomplete
    4. Save to DB + Neo4j asynchronously
    
    Case-sensitive: "IT" and "it" are treated as different words.
    """
    from fastapi.responses import StreamingResponse
    from ..services.llm_service import is_data_complete, lookup_dictionary_stream
    import json
    
    user = _get_current_student(authorization)
    user_id = user["id"]
    
    word_original = req.word.strip()
    word_lower = word_original.lower()
    
    if not word_original or len(word_original) > 100:
        raise HTTPException(status_code=400, detail="Invalid word")

    # Determine lookup key: use original casing if it's all-uppercase (abbreviation)
    is_abbreviation = word_original.isupper() and len(word_original) >= 2
    lookup_key = word_original if is_abbreviation else word_lower

    # 1) Check SQLite dictionary_cache first — but validate completeness
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT data_json, meanings_count, word_original FROM dictionary_cache WHERE word = ?",
            (lookup_key,)
        ).fetchone()
    finally:
        conn.close()
    
    if row:
        cached = json.loads(row["data_json"])
        
        # Completeness check: only return cached data if ALL fields are filled
        if is_data_complete(cached):
            cached["_source"] = "database"
            cached["_meanings_count"] = row["meanings_count"] or 0
            # Enrich with graph connections
            connections = graph_service.get_word_connections(word_lower)
            cached["graph_connections"] = connections.get("connections", [])
            
            # CHECK IF ALREADY SAVED (Fixing "saved status" bug)
            cursor = get_db().execute("SELECT id FROM saved_vocabulary WHERE user_id = ? AND word = ?", (user_id, lookup_key))
            cached["is_saved"] = cursor.fetchone() is not None
            
            return cached
        # Else: data is incomplete, fall through to AI lookup for better data
        print(f"[DICT] Cached data for '{lookup_key}' is incomplete, re-fetching with AI...")

    # 1.5) Check Neo4j cache (survives Render restarts)
    neo4j_cached = graph_service.get_dictionary_cache(lookup_key)
    if neo4j_cached and is_data_complete(neo4j_cached):
        neo4j_cached["_source"] = "database_neo4j_restored"
        neo4j_cached["_meanings_count"] = len(neo4j_cached.get("meanings", []))
        
        # Restore to local SQLite asynchronously
        def _restore_sqlite(key, original, data):
            try:
                c = get_db()
                c.execute(
                    """INSERT OR REPLACE INTO dictionary_cache (word, word_original, data_json, meanings_count)
                       VALUES (?, ?, ?, ?)""",
                    (key, original, json.dumps(data, ensure_ascii=False), data["_meanings_count"])
                )
                c.commit()
                c.close()
            except Exception as e:
                print(f"[DB RESTORE] error: {e}")
        
        if background_tasks:
            background_tasks.add_task(_restore_sqlite, lookup_key, word_original, neo4j_cached)
        else:
            _restore_sqlite(lookup_key, word_original, neo4j_cached)

        connections = graph_service.get_word_connections(word_lower)
        neo4j_cached["graph_connections"] = connections.get("connections", [])
        
        # CHECK IF ALREADY SAVED (Fixing "saved status" bug)
        try:
            cursor = get_db().execute("SELECT id FROM saved_vocabulary WHERE user_id = ? AND word = ?", (user_id, lookup_key))
            neo4j_cached["is_saved"] = cursor.fetchone() is not None
        except:
            neo4j_cached["is_saved"] = False
            
        return neo4j_cached

    # 2) Not cached or incomplete → ask AI Stream
    llm = llm_service.get_llm()
    if not llm:
        if row:
            cached = json.loads(row["data_json"])
            cached["_source"] = "database_partial"
            return cached
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
        except Exception as e:
            print(f"[DB SAVE] dictionary_cache error: {e}")

        # Save ALL meanings to Neo4j
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
                "example": (data.get("meanings", [{}])[0].get("examples") or [""])[0] if data.get("meanings") else "",
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
    # Note: Because the frontend now expects an event stream, we yield chunks.
    def stream_generator():
        try:
            # CHECK SAVED STATUS ONCE AT START
            cursor = get_db().execute("SELECT id FROM saved_vocabulary WHERE user_id = ? AND word = ?", (user_id, lookup_key))
            is_saved = cursor.fetchone() is not None
            
            full_content = ""
            for chunk in lookup_dictionary_stream(lookup_key):
                # We can inject is_saved into result chunks
                if '"status": "result"' in chunk:
                    try:
                        data = json.loads(chunk)
                        data["is_saved"] = is_saved
                        chunk = json.dumps(data, ensure_ascii=False)
                    except: pass
                
                full_content += chunk
                yield f"data: {chunk}\n\n"
            
            # In a real streaming scenario, we'd need to parse the final accumulated string
            # and save it. But because we yield partial JSON chunks, we must parse it here.
            try:
                # The full_content might be an accumulated JSON string from `lookup_dictionary_full_ai_stream`
                # or a combination of `status: thinking` + final JSON string.
                # We do our best to save it in background if valid.
                final_result = llm_service.parse_json_response(full_content)
                if isinstance(final_result, dict) and "word" in final_result:
                    if is_data_complete(final_result):
                        if background_tasks:
                            background_tasks.add_task(_save_to_db_and_neo4j, lookup_key, word_original, final_result)
                        else:
                            _save_to_db_and_neo4j(lookup_key, word_original, final_result)
            except Exception as e:
                print(f"Failed to parse or save streamed result: {e}")

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


# ─── KNOWLEDGE GRAPH VISUALIZATION ───────────────────────────────────────────

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
def generate_ipa(req: IpaRequest, authorization: str = Header(...)):
    _get_current_student(authorization)
    return llm_service.generate_ipa_lesson(req.words, req.focus)

class PracticeRequest(BaseModel):
    test_type: str = "TOEIC"
    skill: str = "reading"
    part: str = ""

@router.post("/practice/generate")
def generate_practice(req: PracticeRequest, authorization: str = Header(...)):
    _get_current_student(authorization)
    return llm_service.generate_practice_test(req.test_type, req.skill, req.part)

class ReadingRequest(BaseModel):
    topic: str = ""
    level: str = "B1"

@router.post("/reading/generate")
def generate_reading(req: ReadingRequest, authorization: str = Header(...)):
    _get_current_student(authorization)
    return llm_service.generate_reading_passage(req.topic, req.level)

class WritingRequest(BaseModel):
    text: str
    task_type: str = "essay"
    target_test: str = "IELTS"

@router.post("/writing/evaluate")
def evaluate_writing(req: WritingRequest, authorization: str = Header(...)):
    _get_current_student(authorization)
    return llm_service.evaluate_writing(req.text, req.task_type, req.target_test)

class SpeakingRequest(BaseModel):
    level: str = "B1"
    topic_type: str = "general"

@router.post("/speaking/topic")
def generate_speaking(req: SpeakingRequest, authorization: str = Header(...)):
    _get_current_student(authorization)
    return llm_service.generate_speaking_topic(req.level, req.topic_type)


@router.post("/file/upload-analyze")
async def student_upload_analyze(
    file: UploadFile = File(...),
    exercise_type: str = Form("mixed"),
    num_questions: int = Form(5),
    authorization: str = Header(...)
):
    """
    Extracts text from an uploaded file and generates exercises automatically.
    Supported types: TXT, PDF, DOCX
    """
    _get_current_student(authorization)
    
    try:
        content = await file.read()
        text = file_service.extract_text_from_file(content, file.filename)
        
        if not text or len(text.strip()) == 0 or text.startswith("("):
            raise HTTPException(status_code=400, detail=f"Could not extract valid text from {file.filename}")
            
        result = llm_service.generate_exercises_from_text(text, exercise_type, num_questions)
        return {"filename": file.filename, "extracted_text_snippet": text[:200], "result": result}
    except Exception as e:
        print(f"File upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

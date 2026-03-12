from fastapi import APIRouter, HTTPException, Header, Query, UploadFile, File, Form, BackgroundTasks, Response
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


def _check_usage_limit(user_id: int, feature: str, limit: int = 5):
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
        """SELECT a.id, a.title, a.description, a.type, a.due_date, a.created_at,
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
        """SELECT a.id, a.title, a.description, a.type, a.quiz_data, a.due_date, a.created_at,
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


from typing import Union

class QuizSubmission(BaseModel):
    answers: Optional[dict] = None  # {question_index: selected_answer}

class TextSubmission(BaseModel):
    text: Optional[str] = None


@router.post("/assignments/{assignment_id}/submit")
def submit_assignment(assignment_id: int, submission: Union[QuizSubmission, TextSubmission], authorization: str = Header(...)):
    student = _get_current_student(authorization)
    conn = get_db()

    # Get assignment with enrollment check
    row = conn.execute(
        """SELECT a.id, a.type, a.quiz_data
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
        # For writing, just save the text, no grading yet
        if not submission.text:
            conn.close()
            raise HTTPException(status_code=400, detail="Text required for writing assignment")
        conn.execute(
            "INSERT INTO student_scores (student_id, assignment_id, score, max_score, submission_text) VALUES (?, ?, ?, ?, ?)",
            (student["id"], assignment_id, 0, 0, submission.text)
        )
        conn.commit()
        conn.close()
        return {"message": "Writing submitted successfully"}
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
def analyze_text(req: TextAnalysisRequest, authorization: str = Header(...)):
    user = _get_current_student(authorization)
    _check_usage_limit(user["id"], "ai-tools")
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
            
            async for chunk in llm_service.lookup_dictionary_stream(lookup_key):
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
async def generate_ipa(req: IpaRequest, authorization: str = Header(...)):
    from fastapi.responses import StreamingResponse
    user = _get_current_student(authorization)
    
    # Check for legacy limit OR new credits
    # In a real app we'd migrate fully to credits, but for now we'll check both
    _check_usage_limit(user["id"], "ipa")
    
    # Deduct credit
    conn = get_db()
    conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 1) WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    async def gen():
        async for chunk in llm_service.generate_ipa_lesson_stream(req.words):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")

class PracticeRequest(BaseModel):
    test_type: str = "TOEIC"
    skill: str = "reading"
    part: str = ""

@router.post("/practice/generate")
async def generate_practice(req: PracticeRequest, authorization: str = Header(...)):
    from fastapi.responses import StreamingResponse
    user = _get_current_student(authorization)
    _check_usage_limit(user["id"], f"practice_{req.test_type}")
    
    # Deduct credit (cost 2 for complex tests)
    conn = get_db()
    conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 2) WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    async def gen():
        async for chunk in llm_service.generate_practice_test_stream(req.test_type, req.skill, req.part):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")

class ReadingRequest(BaseModel):
    topic: str = ""
    level: str = "B1"

@router.post("/reading/generate")
async def generate_reading(req: ReadingRequest, authorization: str = Header(...)):
    from fastapi.responses import StreamingResponse
    user = _get_current_student(authorization)
    _check_usage_limit(user["id"], "reading")
    
    # Deduct credit
    conn = get_db()
    conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 1) WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    async def gen():
        async for chunk in llm_service.generate_reading_passage_stream(req.topic, req.level):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")

class WritingRequest(BaseModel):
    text: str
    task_type: str = "essay"
    target_test: str = "IELTS"

@router.post("/writing/evaluate")
async def evaluate_writing(req: WritingRequest, authorization: str = Header(...)):
    from fastapi.responses import StreamingResponse
    user = _get_current_student(authorization)
    
    # Deduct credit (cost 2)
    conn = get_db()
    conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 2) WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    async def gen():
        async for chunk in llm_service.evaluate_writing_stream(req.text, req.task_type, req.target_test):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")

class SpeakingRequest(BaseModel):
    level: str = "B1"
    topic_type: str = "general"

@router.post("/speaking/topic")
async def generate_speaking(req: SpeakingRequest, authorization: str = Header(...)):
    from fastapi.responses import StreamingResponse
    user = _get_current_student(authorization)
    
    # Deduct credit
    conn = get_db()
    conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 1) WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    async def gen():
        async for chunk in llm_service.generate_speaking_topic_stream(req.level, req.topic_type):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.post("/file/upload-analyze")
async def student_upload_analyze(
    file: UploadFile = File(...),
    exercise_type: str = Form("mixed"),
    num_questions: int = Form(5),
    authorization: str = Header(...)
):
    from fastapi.responses import StreamingResponse
    user = _get_current_student(authorization)

    if hasattr(file, 'size') and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")

    # Deduct credits
    conn = get_db()
    conn.execute("UPDATE users SET credits_ai = MAX(0, credits_ai - 3) WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    content = await file.read()
    text = file_service.extract_text_from_file(content, file.filename)
    
    if not text or len(text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    async def gen():
        async for chunk in llm_service.generate_exercises_from_text_stream(text, exercise_type, num_questions):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


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

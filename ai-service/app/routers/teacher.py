from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.responses import Response, StreamingResponse
from ..database import get_db, AssignmentCreate
from ..services import auth_service, llm_service, graph_service, file_service

from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter(prefix="/teacher", tags=["Teacher"])


def _get_current_teacher(authorization: str = Header(...)):
    """Extract teacher from JWT token. Raises 401/403 if invalid."""
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
    if user["role"] not in ("TEACHER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Teacher access required")
    return dict(user)


# ===================== STATS =====================

@router.get("/stats")
def teacher_stats(authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM classes WHERE teacher_id = ?",
                   (teacher["id"],))
    classes_count = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(DISTINCT e.student_id) FROM enrollments e
        JOIN classes c ON e.class_id = c.id
        WHERE c.teacher_id = ?
    """, (teacher["id"],))
    students_count = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*) FROM lessons l
        JOIN classes c ON l.class_id = c.id
        WHERE c.teacher_id = ?
    """, (teacher["id"],))
    lessons_count = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*) FROM assignments
        WHERE teacher_id = ?
    """, (teacher["id"],))
    assignments_count = cursor.fetchone()[0]

    conn.close()
    return {
        "classes": classes_count,
        "students": students_count,
        "lessons": lessons_count,
        "assignments": assignments_count,
        "teacher_name": teacher["name"]
    }


# ===================== MY CLASSES =====================

@router.get("/my-classes")
def get_my_classes(authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("""
        SELECT c.id, c.name, c.teacher_name, c.students_count, c.teacher_id,
               (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as enrolled_count
        FROM classes c
        WHERE c.teacher_id = ?
        ORDER BY c.id DESC
    """, (teacher["id"],))
    classes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return classes

@router.post("/my-classes")
def create_my_class(authorization: str = Header(...), name: str = Form(...), description: str = Form("")):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO classes (name, teacher_name, students_count, teacher_id) VALUES (?, ?, 0, ?)",
        (name, teacher["name"], teacher["id"])
    )
    conn.commit()
    conn.close()
    return {"message": "Tạo lớp học thành công"}

@router.put("/my-classes/{class_id}")
def update_my_class(class_id: int, authorization: str = Header(...), name: str = Form(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    # Verify ownership
    cursor = conn.execute("SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
                          (class_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền sửa lớp này")
    conn.execute("UPDATE classes SET name = ? WHERE id = ?", (name, class_id))
    conn.commit()
    conn.close()
    return {"message": "Cập nhật lớp học thành công"}

@router.delete("/my-classes/{class_id}")
def delete_my_class(class_id: int, authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
                          (class_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền xoá lớp này")
    conn.execute("DELETE FROM enrollments WHERE class_id = ?", (class_id,))
    conn.execute("DELETE FROM lessons WHERE class_id = ?", (class_id,))
    conn.execute("DELETE FROM assignments WHERE class_id = ?", (class_id,))
    conn.execute("DELETE FROM classes WHERE id = ?", (class_id,))
    conn.commit()
    conn.close()
    return {"message": "Xoá lớp học thành công"}


# ===================== STUDENTS (ENROLLMENTS) =====================

@router.get("/my-classes/{class_id}/students")
def get_class_students(class_id: int, authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    # Verify ownership
    cursor = conn.execute("SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
                          (class_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem lớp này")

    cursor = conn.execute("""
        SELECT u.id, u.name, u.email, e.enrolled_at
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        WHERE e.class_id = ?
        ORDER BY u.name
    """, (class_id,))
    students = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return students

@router.get("/available-students")
def get_available_students(authorization: str = Header(...), class_id: int = Query(...)):
    """List students not yet enrolled in the given class."""
    _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("""
        SELECT id, name, email FROM users
        WHERE role = 'STUDENT' AND id NOT IN (
            SELECT student_id FROM enrollments WHERE class_id = ?
        )
        ORDER BY name
    """, (class_id,))
    students = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return students

@router.post("/my-classes/{class_id}/enroll")
def enroll_student(class_id: int, authorization: str = Header(...), student_id: int = Form(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
                          (class_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền thêm học sinh vào lớp này")
    try:
        conn.execute("INSERT INTO enrollments (student_id, class_id) VALUES (?, ?)", (student_id, class_id))
        # Update students_count
        conn.execute("UPDATE classes SET students_count = (SELECT COUNT(*) FROM enrollments WHERE class_id = ?) WHERE id = ?", (class_id, class_id))
        conn.commit()
    except Exception:
        conn.close()
        raise HTTPException(status_code=400, detail="Học sinh đã có trong lớp này")
    conn.close()
    return {"message": "Thêm học sinh thành công"}

@router.delete("/my-classes/{class_id}/students/{student_id}")
def remove_student(class_id: int, student_id: int, authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
                          (class_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền")
    conn.execute("DELETE FROM enrollments WHERE student_id = ? AND class_id = ?", (student_id, class_id))
    conn.execute("UPDATE classes SET students_count = (SELECT COUNT(*) FROM enrollments WHERE class_id = ?) WHERE id = ?", (class_id, class_id))
    conn.commit()
    conn.close()
    return {"message": "Xoá học sinh khỏi lớp thành công"}


# ===================== LESSONS =====================

@router.get("/my-classes/{class_id}/lessons")
def get_class_lessons(class_id: int, authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
                          (class_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem lớp này")

    cursor = conn.execute("""
        SELECT l.id, l.class_id, l.title, l.content, l.file_name,
               c.name as class_name
        FROM lessons l JOIN classes c ON l.class_id = c.id
        WHERE l.class_id = ?
        ORDER BY l.id DESC
    """, (class_id,))
    lessons = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return lessons

@router.post("/my-classes/{class_id}/lessons")
async def create_class_lesson(
    class_id: int,
    authorization: str = Header(...),
    title: str = Form(...),
    content: str = Form(""),
    file: Optional[UploadFile] = File(None)
):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
                          (class_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền")

    file_name = None
    file_data = None
    if file and file.filename:
        file_name = file.filename
        file_data = await file.read()

    conn.execute("INSERT INTO lessons (class_id, title, content, file_name, file_data) VALUES (?, ?, ?, ?, ?)",
                 (class_id, title, content, file_name, file_data))
    conn.commit()
    conn.close()
    return {"message": "Tạo bài học thành công"}

@router.put("/lessons/{lesson_id}")
async def update_teacher_lesson(
    lesson_id: int,
    authorization: str = Header(...),
    title: str = Form(...),
    content: str = Form(""),
    file: Optional[UploadFile] = File(None)
):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    # Verify teacher owns the class that this lesson belongs to
    cursor = conn.execute("""
        SELECT l.id FROM lessons l JOIN classes c ON l.class_id = c.id
        WHERE l.id = ? AND c.teacher_id = ?
    """, (lesson_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền sửa bài này")

    if file and file.filename:
        file_name = file.filename
        file_data = await file.read()
        conn.execute("UPDATE lessons SET title=?, content=?, file_name=?, file_data=? WHERE id=?",
                     (title, content, file_name, file_data, lesson_id))
    else:
        conn.execute("UPDATE lessons SET title=?, content=? WHERE id=?", (title, content, lesson_id))
    conn.commit()
    conn.close()
    return {"message": "Cập nhật bài học thành công"}

@router.delete("/lessons/{lesson_id}")
def delete_teacher_lesson(lesson_id: int, authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("""
        SELECT l.id FROM lessons l JOIN classes c ON l.class_id = c.id
        WHERE l.id = ? AND c.teacher_id = ?
    """, (lesson_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền xoá bài này")
    conn.execute("DELETE FROM lessons WHERE id = ?", (lesson_id,))
    conn.commit()
    conn.close()
    return {"message": "Xoá bài học thành công"}

@router.get("/lessons/{lesson_id}/file")
def get_teacher_lesson_file(lesson_id: int, authorization: str = Header(...)):
    _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT file_name, file_data FROM lessons WHERE id = ?", (lesson_id,))
    row = cursor.fetchone()
    conn.close()
    if not row or not row['file_data']:
        raise HTTPException(status_code=404, detail="Không tìm thấy file đính kèm")
    return Response(content=row['file_data'], media_type="application/octet-stream",
                    headers={"Content-Disposition": f"attachment; filename=\"{row['file_name']}\""})


# ===================== ASSIGNMENTS =====================

@router.get("/my-classes/{class_id}/assignments")
def get_class_assignments(class_id: int, authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
                          (class_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền")

    cursor = conn.execute("""
        SELECT a.id, a.class_id, a.title, a.description, a.quiz_data, a.due_date, a.created_at,
               c.name as class_name,
               (SELECT COUNT(*) FROM student_scores s WHERE s.assignment_id = a.id) as submissions
        FROM assignments a JOIN classes c ON a.class_id = c.id
        WHERE a.class_id = ? AND a.teacher_id = ?
        ORDER BY a.id DESC
    """, (class_id, teacher["id"]))
    assignments = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return assignments

@router.get("/assignments")
def get_all_my_assignments(authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("""
        SELECT a.id, a.class_id, a.title, a.description, a.quiz_data, a.due_date, a.created_at,
               c.name as class_name,
               (SELECT COUNT(*) FROM student_scores s WHERE s.assignment_id = a.id) as submissions
        FROM assignments a JOIN classes c ON a.class_id = c.id
        WHERE a.teacher_id = ?
        ORDER BY a.id DESC
    """, (teacher["id"],))
    assignments = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return assignments

@router.post("/assignments")
def create_assignment(data: AssignmentCreate, authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    # Verify teacher owns this class
    cursor = conn.execute("SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
                          (data.class_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền tạo bài tập cho lớp này")
    conn.execute(
        "INSERT INTO assignments (class_id, teacher_id, title, description, quiz_data, due_date) VALUES (?, ?, ?, ?, ?, ?)",
        (data.class_id, teacher["id"], data.title, data.description, data.quiz_data, data.due_date)
    )
    conn.commit()
    conn.close()
    return {"message": "Tạo bài tập thành công"}

@router.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT id FROM assignments WHERE id = ? AND teacher_id = ?",
                          (assignment_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền xoá bài tập này")
    conn.execute("DELETE FROM student_scores WHERE assignment_id = ?", (assignment_id,))
    conn.execute("DELETE FROM assignments WHERE id = ?", (assignment_id,))
    conn.commit()
    conn.close()
    return {"message": "Xoá bài tập thành công"}

@router.get("/assignments/{assignment_id}/scores")
def get_assignment_scores(assignment_id: int, authorization: str = Header(...)):
    teacher = _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT id FROM assignments WHERE id = ? AND teacher_id = ?",
                          (assignment_id, teacher["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền")
    cursor = conn.execute("""
        SELECT s.id, s.score, s.max_score, s.submitted_at,
               u.name as student_name, u.email as student_email
        FROM student_scores s
        JOIN users u ON s.student_id = u.id
        WHERE s.assignment_id = ?
        ORDER BY s.submitted_at DESC
    """, (assignment_id,))
    scores = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return scores


# ===================== AI TOOLS =====================

@router.post("/generate-quiz")
def generate_quiz_for_class(authorization: str = Header(...), text: str = Form(...), num_questions: int = Form(5)):
    """Use AI to generate quiz from text for teacher to assign."""
    _get_current_teacher(authorization)
    llm = llm_service.get_llm()
    if not llm:
        raise HTTPException(status_code=503, detail="LLM service not available — configure API key in Admin settings")
    result = llm_service.generate_quiz_from_text(text, num_questions)
    return result

@router.post("/generate-vocab")
def generate_vocab_for_class(authorization: str = Header(...), text: str = Form(...)):
    """Use AI to extract vocabulary from text."""
    _get_current_teacher(authorization)
    llm = llm_service.get_llm()
    if not llm:
        raise HTTPException(status_code=503, detail="LLM service not available — configure API key in Admin settings")
    result = llm_service.extract_vocabulary_from_text(text)
    return result


class TeacherDictRequest(BaseModel):
    word: str


@router.post("/dictionary/lookup")
def teacher_dictionary_lookup(req: TeacherDictRequest, authorization: str = Header(...), background_tasks: BackgroundTasks = None):
    """
    Dictionary lookup with Streaming: DB cache → Neo4j → AI Stream → save to DB + Neo4j.
    """
    from fastapi.responses import StreamingResponse
    from ..services.llm_service import is_data_complete, lookup_dictionary_stream
    import json
    
    user = _get_current_teacher(authorization)
    user_id = user["id"]
    word_original = req.word.strip()
    word_lower = word_original.lower()
    if not word_original or len(word_original) > 100:
        raise HTTPException(status_code=400, detail="Invalid word")

    # Determine lookup key
    is_abbreviation = word_original.isupper() and len(word_original) >= 2
    lookup_key = word_original if is_abbreviation else word_lower

    # 1) Check SQLite dictionary_cache first (persistent, full data)
    conn = get_db()
    try:
        row = conn.execute("SELECT data_json, meanings_count, word_original FROM dictionary_cache WHERE word = ?", (lookup_key,)).fetchone()
    finally:
        conn.close()
        
    if row:
        cached = json.loads(row["data_json"])
        if is_data_complete(cached):
            cached["_source"] = "database"
            cached["_meanings_count"] = row["meanings_count"] or 0
            connections = graph_service.get_word_connections(word_lower)
            cached["graph_connections"] = connections.get("connections", [])
            
            # CHECK IF ALREADY SAVED (Fixing "saved status" bug)
            try:
                cursor = get_db().execute("SELECT id FROM saved_vocabulary WHERE user_id = ? AND word = ?", (user_id, lookup_key))
                cached["is_saved"] = cursor.fetchone() is not None
            except:
                cached["is_saved"] = False
                
            return cached

    # 1.5) Check Neo4j cache
    neo4j_cached = graph_service.get_dictionary_cache(lookup_key)
    if neo4j_cached and is_data_complete(neo4j_cached):
        neo4j_cached["_source"] = "database_neo4j_restored"
        neo4j_cached["_meanings_count"] = len(neo4j_cached.get("meanings", []))
        
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

    # 2) Not cached → ask AI Stream
    llm = llm_service.get_llm()
    if not llm:
        # LLM unavailable - return partial cache if exists
        if row:
            cached = json.loads(row["data_json"])
            cached["_source"] = "database_partial"
            # Try to get graph connections anyway
            connections = graph_service.get_word_connections(word_lower)
            cached["graph_connections"] = connections.get("connections", [])
            return cached
        # Try Neo4j as last resort
        neo4j_cached = graph_service.get_dictionary_cache(lookup_key)
        if neo4j_cached:
            neo4j_cached["_source"] = "database_neo4j_fallback"
            connections = graph_service.get_word_connections(word_lower)
            neo4j_cached["graph_connections"] = connections.get("connections", [])
            return neo4j_cached
        raise HTTPException(status_code=503, detail="LLM service unavailable")

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

    def stream_generator():
        try:
            # CHECK SAVED STATUS ONCE AT START
            try:
                cursor = get_db().execute("SELECT id FROM saved_vocabulary WHERE user_id = ? AND word = ?", (user_id, lookup_key))
                is_saved = cursor.fetchone() is not None
            except:
                is_saved = False
                
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
            
            try:
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


@router.get("/knowledge-graph")
def teacher_knowledge_graph(authorization: str = Header(...), topic: str = "all"):
    """Get vocabulary knowledge graph for visualization."""
    _get_current_teacher(authorization)
    return graph_service.get_knowledge_subgraph(topic)


@router.post("/file/generate-assignment")
async def teacher_generate_assignment_from_file(
    file: UploadFile = File(...),
    exercise_type: str = Form("mixed"),
    num_questions: int = Form(10),
    authorization: str = Header(...)
):
    """
    Upload a document (PDF, DOCX, TXT), extract text, and automatically generate an assignment/quiz.
    """
    _get_current_teacher(authorization)
    
    try:
        content = await file.read()
        text = file_service.extract_text_from_file(content, file.filename)
        
        if not text or len(text.strip()) == 0 or text.startswith("("):
            raise HTTPException(status_code=400, detail=f"Could not extract valid text from {file.filename}")
            
        result = llm_service.generate_exercises_from_text(text, exercise_type, num_questions)
        return {"filename": file.filename, "extracted_text_snippet": text[:200], "result": result}
    except Exception as e:
        print(f"Teacher file upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GRAMMAR ────────────────────────────────────────────────────────────────

@router.get("/grammar")
def get_grammar_rules(authorization: str = Header(...)):
    _get_current_teacher(authorization)
    conn = get_db()
    cursor = conn.execute("SELECT id, name, description, file_name, created_at FROM grammar_rules ORDER BY id DESC")
    columns = [column[0] for column in cursor.description]
    results = [dict(zip(columns, row)) for row in cursor.fetchall()]
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

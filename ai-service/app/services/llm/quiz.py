import json
import time
import re
import asyncio
from typing import List, Dict, Optional, Any
from langchain_core.prompts import PromptTemplate

from langchain_core.output_parsers import PydanticOutputParser

from .schemas import QuizListSchema, FSRSQuizListSchema
from .providers import (
    get_llm, _safe_invoke, _safe_invoke_async, _safe_astream, 
    ai_semaphore, parse_json_response, truncate_context, 
    _is_valid_quiz_payload, _is_valid_exercises_payload, rerank_results,
    _is_local_fast_mode, _parse_json_strict
)
from ...database import get_db, get_setting, log_ai_request, is_provider_failed
from ..referee_service import trigger_evaluation, fast_repair_json
from .. import graph_service
from .reading import (
    generate_reading_passage,
    generate_reading_passage_stream,
    generate_reading_comprehension,
    generate_reading_comprehension_stream
)

async def generate_quiz_from_text(text: str, num_questions: int = 5):
    """
    Generates dynamic IELTS-style questions (MCQ, T/F/NG, Matching, Fill-in-blanks)
    based on the specific text context.
    Ensured strict format with PydanticOutputParser.
    """
    difficulty = "easy" if _is_local_fast_mode() else "medium"
    llm = get_llm(difficulty=difficulty)
    if not llm:
        return []
        
    parser = PydanticOutputParser(pydantic_object=QuizListSchema)
    
    prompt = PromptTemplate(
        template=(
            "You are an expert IELTS exam content creator.\n"
            "Generate {num} high-quality questions based on this English text:\n"
            "{text}\n\n"
            "QUESTION TYPES TO INCLUDE (Mix them):\n"
            "1. Multiple Choice (MCQ): Standard 4-option question.\n"
            "2. True/False/Not Given (TFNG): Test if a statement is True, False, or Not Mentioned in the text.\n"
            "3. Matching (MATCH): Match a term/name to a description/statement.\n"
            "4. Fill-in-the-blanks (FIB): Provide a sentence with a [blank] and 4 options to fill it correctly.\n\n"
            "REQUIREMENTS:\n"
            "- Options must be plausible distractors.\n"
            "- Ensure the context is strictly based on the text.\n"
            "CRITICAL: ALL questions, options, and answers MUST be in English only. Do NOT include Vietnamese in any question, option, or answer field. Explanations may include Vietnamese translations.\n\n"
            "{format_instructions}\n"
        ),
        input_variables=["num", "text"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )

    chain = prompt | llm
    repair_context = f"Quiz from text ({num_questions} questions): {text[:220]}"
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {"text": text, "num": num_questions}, difficulty=difficulty, feature="Quiz Generation")
            # Fast path: strict parser first.
            try:
                result = parser.invoke(response)
                return [item.model_dump() for item in result.items]
            except Exception:
                # Slow path: one-shot repair only when format is invalid.
                repaired = await fast_repair_json(repair_context, getattr(response, "content", ""), feature="Quiz Generation")
                if repaired:
                    repaired_obj = _parse_json_strict(repaired)
                    if _is_valid_quiz_payload(repaired_obj):
                        if isinstance(repaired_obj, dict):
                            items = repaired_obj.get("items", [])
                        else:
                            items = repaired_obj
                        return items

                # Last fallback: old tolerant parser.
                res = parse_json_response(getattr(response, "content", ""))
                if _is_valid_quiz_payload(res):
                    return res if isinstance(res, list) else res.get("items", [])
                return []
    except Exception as e:
        print(f"generate_quiz error: {e}")
        if 'response' in locals() and hasattr(response, 'content'):
            res = parse_json_response(response.content)
            if isinstance(res, list) and len(res) > 0:
                return res
        return []

def generate_fsrs_review_quiz(words: list):
    """
    Generates a contextual review quiz for a list of words due for SRS review.
    Ensures strict format consistency with Pydantic schemas.
    """
    llm = get_llm(difficulty="easy")
    if not llm or not words:
        return []

    words_str = ", ".join([f"{w['word']} ({w['meaning_en']})" for w in words])
    parser = PydanticOutputParser(pydantic_object=FSRSQuizListSchema)
    
    prompt = PromptTemplate(
        template=(
            "You are a specialized English language tutor. Generate an engaging review quiz for these vocabulary words: {words}\n\n"
            "QUESTION TYPES TO INCLUDE (Mix them up):\n"
            "1. MCQ: Choose the correct definition or synonym.\n"
            "2. FIB: Fill in the blanks. Provide a `context` sentence with a '[blank]', where the `answer` fits perfectly.\n"
            "3. SPELLING: Give a meaning or context, and ask the user to type the word exactly. No options needed.\n"
            "4. PARAPHRASE: Provide a sentence, ask the user to choose the option that has the closest meaning.\n\n"
            "REQUIREMENTS:\n"
            "- CRITICAL: Ensure ALL questions, contexts, options, and answers are **100% strictly in English**. DO NOT include any Vietnamese in them.\n"
            "- CRITICAL: For MCQ, FIB, and PARAPHRASE types, the `answer` string MUST EXACTLY MATCH one of the items in the `options` array. It cannot be slightly different.\n"
            "- The only fields allowed to hold Vietnamese are `hint_vn` (to help the user) and `explanation_en` (which must actually be in English despite the name mismatch).\n"
            "- The 'word_id' should map back to the 'id' of the word being tested from this list.\n\n"
            "{format_instructions}\n"
        ),
        input_variables=["words"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )

    # Note: frontend needs to handle word_id mapping if we want to auto-update FSRS after these quizzes.
    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {"words": words_str}, feature="FSRS Quiz")
        result = parser.invoke(response)
        return [item.model_dump() for item in result.items]
    except Exception as e:
        print(f"generate_fsrs_review_quiz error: {e}")
        if 'response' in locals() and hasattr(response, 'content'):
            res = parse_json_response(response.content)
            if isinstance(res, list) and len(res) > 0:
                return res
        return []


async def generate_exercises_from_text(text: str, exercise_type: str = "mixed", num_questions: int = 10):
    """Generate exercises from extracted file text. Supports: quiz, fill-blanks, matching, mixed."""
    llm = get_llm(difficulty="easy")
    if not llm:
        return {"error": "LLM not configured"}

    # Truncate long texts
    # Slightly shorter context in local-fast mode to reduce latency spikes.
    max_chars = 2200 if _is_local_fast_mode() else 3000
    text_truncated = text[:max_chars] if len(text) > max_chars else text

    # Fetch grammar rules from database
    grammar_context = ""
    try:
        from ..database import get_db
        conn = get_db()
        cursor = conn.execute("SELECT name, description FROM grammar_rules ORDER BY id DESC")
        rules = cursor.fetchall()
        conn.close()
        if rules:
            grammar_context = "\n\nWe are currently focusing on the following GRAMMAR STRUCTURES. You MUST prioritize applying these grammar rules in your generated exercises if they fit the context of the text:\n"
            for r in rules:
                name = r["name"]
                desc = r["description"] or ""
                grammar_context += f"- {name}: {desc[:100]}...\n"
    except Exception as e:
        print(f"Error fetching grammar rules for AI: {e}")

    prompt = PromptTemplate.from_template(
        "You are a premium English language assessment designer creating exercises from the following text.\n\n"
        "TEXT:\n{text}\n\n"
        "{grammar_context}"
        "TASKS:\n"
        "1. Extract 5-8 key vocabulary words from the text.\n"
        "2. Create {num} MIXED exercises. Include these types:\n"
        "   - MCQ: Multiple choice for definition or synonym.\n"
        "   - FIB: Fill in the blanks. Use a context sentence from the text (or inspired by it) with a '[blank]'.\n"
        "   - SPELLING: Ask the user to spell a word based on its meaning/context.\n"
        "   - PARAPHRASE: Choose an option that has the closest meaning to a sentence from the text.\n\n"
        "REQUIREMENTS:\n"
        "- CRITICAL: ALL questions, options, and answers MUST be strictly in English. NO Vietnamese here.\n"
        "- ONLY 'summary_vn', 'meaning_vn', and 'explanation_vn' should be in Vietnamese.\n"
        "- For MCQ, FIB, and PARAPHRASE, the `answer` MUST exactly match one of the `options` strings.\n"
        "- Return a JSON object with:\n"
        '  "title": suggested exercise title\n'
        '  "difficulty": estimated CEFR level (A1-C2)\n'
        '  "vocabulary": array of {{"word", "meaning_vn", "meaning_en", "pos", "phonetic", "example"}}\n'
        '  "exercises": array of {{"type", "question", "options", "answer", "explanation_vn", "hint_vn"}}\n'
        '  "summary_vn": Vietnamese summary of the text\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    repair_context = f"Text Exercises type={exercise_type}, num={num_questions}, text={text_truncated[:220]}"
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {
                "text": text_truncated,
                "exercise_type": exercise_type,
                "num": num_questions,
                "grammar_context": grammar_context
            }, difficulty="easy", feature="Text Exercises")
            parsed = _parse_json_strict(getattr(response, "content", ""))
            if not _is_valid_exercises_payload(parsed):
                repaired = await fast_repair_json(repair_context, getattr(response, "content", ""), feature="Text Exercises")
                if repaired:
                    parsed = _parse_json_strict(repaired)

            if _is_valid_exercises_payload(parsed):
                # Normalize: ensure frontend-expected 'quiz' key exists
                if "exercises" in parsed and "quiz" not in parsed:
                    parsed["quiz"] = parsed.pop("exercises")
                return parsed

            result = parse_json_response(getattr(response, "content", ""))
            if isinstance(result, dict):
                if "exercises" in result and "quiz" not in result:
                    result["quiz"] = result.pop("exercises")
                if _is_valid_exercises_payload(result):
                    return result
            return {"error": "Could not generate exercises"}
    except Exception as e:
        print(f"generate_exercises_from_text error: {e}")
        return {"error": str(e)}


async def generate_exercises_from_text_stream(text: str, exercise_type: str = "mixed", num_questions: int = 10):
    """Streaming version of generate_exercises_from_text."""
    llm = get_llm(difficulty="medium")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return

    text_truncated = text[:3000] if len(text) > 3000 else text
    
    # Try to get grammar context from Neo4j
    relevant_rules = graph_service.get_relevant_grammar_rules(text_truncated)
    
    grammar_context = ""
    if relevant_rules:
        grammar_context = "\n\nRelevant Grammar Rules from Knowledge Graph:\n"
        for r in relevant_rules:
            grammar_context += f"- {r['name']}: {r['description']}\n"
    else:
        # Fallback to general SQL lookup if graph fails/empty
        try:
            conn = get_db()
            cursor = conn.execute("SELECT name, description FROM grammar_rules ORDER BY id DESC LIMIT 3")
            rules = cursor.fetchall()
            conn.close()
            if rules:
                grammar_context = "\n\nFocus Grammar Rules:\n"
                for r in rules:
                    grammar_context += f"- {r['name']}: {r['description']}\n"
        except: pass

    prompt = PromptTemplate.from_template(
        "You are an English teacher.\nTEXT:\n{text}\n\n{grammar_context}\n"
        "Create {num} {exercise_type} exercises.\n"
        "Return JSON with:\n"
        '- "title": title of the content\n'
        '- "difficulty": CEFR level\n'
        '- "vocabulary": array of 10 objects with keys: word, meaning_vn, meaning_en, pos, example, phonetic\n'
        '- "quiz": array of {num} objects with keys: type, question, options, correct_answer, explanation\n'
        '- "summary_vn": brief summary in Vietnamese\n'
        "Return ONLY valid JSON."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "text": text_truncated,
        "exercise_type": exercise_type,
        "num": num_questions,
        "grammar_context": grammar_context
    }, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        result["status"] = "success"
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)


async def generate_practice_test(test_type: str = "TOEIC", skill: str = "reading", part: str = ""):
    """Generate TOEIC/IELTS practice test questions with realistic structure."""
    llm = get_llm(difficulty="easy")
    if not llm:
        return {"error": "LLM not configured"}

    # Build context-aware prompt based on test type and part
    toeic_parts_context = ""
    ielts_context = ""

    if test_type == "TOEIC":
        toeic_parts_context = (
            "TOEIC FORMAT RULES:\n"
            "The TOEIC test has 7 parts:\n"
            "- Part 1 (Listening - Photographs): Describe what you see in a photo. 4 options per question.\n"
            "- Part 2 (Listening - Question-Response): Short questions with 3 response choices.\n"
            "- Part 3 (Listening - Conversations): Dialogue between 2-3 people, then questions about the conversation.\n"
            "- Part 4 (Listening - Talks): A monologue/announcement, then questions about it.\n"
            "- Part 5 (Reading - Incomplete Sentences): Fill in the blank with correct word/grammar.\n"
            "- Part 6 (Reading - Text Completion): A passage with blanks to fill in.\n"
            "- Part 7 (Reading - Reading Comprehension): Single/double/triple passage with comprehension questions.\n\n"
            f"Generate questions specifically for: {part if part else 'a mix of reading parts (5-7)'}\n"
        )
    elif test_type == "IELTS":
        if skill == "writing":
            ielts_context = (
                "IELTS WRITING FORMAT:\n"
                "Generate BOTH tasks in one response:\n"
                "- Task 1 (20 min, 150+ words): Describe a graph, chart, table, diagram, or map. Provide a description of the visual and ask the student to summarize it.\n"
                "- Task 2 (40 min, 250+ words): Write an essay on a given topic. Provide the essay prompt.\n\n"
                "The response must include 'writing_tasks' array with 2 objects, each having: task_number, title, prompt, time_limit_minutes, min_words, scoring_criteria.\n"
            )
        else:
            ielts_context = (
                f"IELTS {skill.upper()} FORMAT:\n"
                "Generate realistic IELTS-style questions.\n"
            )

    prompt = PromptTemplate.from_template(
        "You are an expert {test_type} exam preparation tutor.\n"
        "Generate a practice section for: {test_type} - {skill} {part}\n\n"
        "{format_context}"
        "CRITICAL RULES:\n"
        "1. ALL questions, options, and passage MUST be in English only. Do NOT use Vietnamese in questions or options.\n"
        "2. 'correct_answer' MUST be the EXACT TEXT of the correct option, not a letter index.\n"
        "3. Include 'explanation_vn' for EACH question with detailed Vietnamese explanation.\n"
        "4. SKILL-SPECIFIC RULES:\n"
        "   - If skill is WRITING: Return 'writing_tasks' array instead of 'questions'. Each task has task_number, title, prompt, time_limit_minutes, min_words, scoring_criteria.\n"
        "   - If skill is SPEAKING: Set 'questions' to [] and provide 'passage' as topic, 'sub_questions' as guidance, 'model_answer', 'evaluation_criteria', and 'useful_vocabulary' with phrase/meaning_vn items.\n"
        "   - If skill is LISTENING or READING: Provide 'passage' as transcript/text and 'questions' array.\n\n"
        "Return a JSON object with:\n"
        '"test_type": "{test_type}"\n'
        '"skill": "{skill}"\n'
        '"part": description of which part\n'
        '"passage": the text passage/prompt/transcript\n'
        '"questions": array of 5-8 question objects (for reading/listening)\n'
        '"scoring_criteria": array of strings (for writing)\n'
        '"sub_questions": array of strings (for speaking)\n'
        '"useful_vocabulary": array of objects (for speaking)\n'
        '"tips": array of 2-3 exam tips in Vietnamese\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    # Combine contexts
    format_context = f"{toeic_parts_context}\n{ielts_context}"

    chain = prompt | llm
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {
                "test_type": test_type,
                "skill": skill,
                "part": part or "general",
                "format_context": format_context
            }, difficulty="easy", feature="Practice Test")
            result = parse_json_response(response.content)
            if isinstance(result, dict):
                return result
            return {"error": "Could not generate practice test"}
    except Exception as e:
        print(f"generate_practice_test error: {e}")
        return {"error": str(e)}


async def generate_practice_test_stream(test_type: str = "TOEIC", skill: str = "reading", part: str = ""):
    """Streaming version of generate_practice_test."""
    llm = get_llm(difficulty="easy")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return

    prompt = PromptTemplate.from_template(
        "You are a professional {test_type} examiner and content creator.\n"
        "Generate a high-quality practice section for: {test_type} - {skill} {part}\n\n"
        "INSTRUCTIONS FOR {skill}:\n"
        "- If READING: Provide a formal or semi-formal passage (200-300 words). Questions should test comprehension, inference, and vocabulary.\n"
        "- If LISTENING: Provide a transcript representing a dialogue or lecture. The user UI will treat this as 'simulated audio content'.\n"
        "- If WRITING: Provide a specific prompt/task (e.g., Essay Topic for IELTS, Email for TOEIC). The 'questions' array should be empty, but provide a 'scoring_criteria' field instead.\n\n"
        "Requirements:\n"
        "1. Strictly follow {test_type} formats.\n"
        "2. Include 5-8 questions (except for Writing).\n"
        "3. Provide detailed explanations in Vietnamese for all questions.\n\n"
        "Return a JSON object with this structure:\n"
        '- "test_type": "{test_type}"\n'
        '- "skill": "{skill}"\n'
        '- "passage": "the prompt/transcript/reading text"\n'
        '- "questions": [\n'
        '    {{"number": 1, "question": "...", "options": ["A", "B", "C", "D"], "correct_answer": "...", "explanation": "..."}}\n'
        ']\n'
        '- "tips": ["exam tip 1 in Vietnamese", "exam tip 2"]\n'
        '- "scoring_criteria": ["point 1", "point 2"] (for writing only)\n\n'
        "Return ONLY the raw JSON object."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "test_type": test_type,
        "skill": skill,
        "part": part or "general",
    }, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        result["status"] = "success"
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)






async def generate_grammar_rule_description(topic: str):
    """Generate a high-quality grammar rule explanation for Admins."""
    llm = get_llm(difficulty="hard")
    if not llm:
        return {"name": topic, "description": "LLM not configured"}
    # Pre-emptively detect if we are using a fallback because Gemini is failed
    persistent_warning = ""
    if is_provider_failed("Gemini"):
        persistent_warning = "> [!CAUTION]\n> **Cảnh báo:** API Key Gemini của bạn đã hết hạn hoặc không khả dụng. Hệ thống đang sử dụng AI dự phòng với chất lượng thấp hơn. Vui lòng cập nhật API Key mới.\n\n"

    prompt = PromptTemplate.from_template(
        "Bạn là một chuyên gia giảng dạy tiếng Anh đầy nhiệt huyết, nổi tiếng với phong cách truyền cảm hứng.\n"
        "Hãy soạn một bài giảng SÂU SẮC và CHI TIẾT về chủ đề: '{topic}'.\n\n"
        "BÀI GIẢNG PHẢI BAO GỒM:\n"
        "1. TỔNG QUAN: Giải thích bản chất một cách thú vị, dễ hiểu.\n"
        "2. CÔNG THỨC: Trình bày rõ ràng, sử dụng bảng hoặc in đậm (bold).\n"
        "3. CÁCH DÙNG: Ít nhất 3-4 tình huống thực tế khác nhau.\n"
        "4. VÍ DỤ: 5 câu ví dụ đa dạng, kèm dịch nghĩa tiếng Việt trau chuốt.\n"
        "5. LƯU Ý: Những 'mẹo' nhỏ và lỗi người Việt hay mắc phải.\n\n"
        "YÊU CẦU: Viết ít nhất 1000-1500 ký tự. Hãy trình bày bằng Markdown chuyên nghiệp.\n\n"
        "ĐỊNH DẠNG: Chỉ trả về duy nhất 1 khối JSON:\n"
        "{{\"name\": \"Tên bài học\", \"description\": \"...Nội dung bài giảng tại đây...\"}}\n"
    )
    chain = prompt | llm
    try:
        response = await _safe_invoke_async(chain, {"topic": topic}, difficulty="hard", feature="Grammar Rule")
        if not response or not response.content:
            print(f"[LLM ERROR] Empty response for topic: {topic}")
            return {"name": topic, "description": f"{persistent_warning}AI không phản hồi nội dung. Vui lòng thử lại."}
            
        print(f"[LLM DEBUG] Raw AI response for '{topic}': {response.content[:200]}...")
        result = parse_json_response(response.content)
        
        # QUALITY CONTROL: If description is too short (under 500 chars), the AI was "lazy". Retry ONCE.
        if isinstance(result, dict) and len(result.get("description", "")) < 500:
             print(f"[LLM QUALITY] Result too short ({len(result['description'])} chars). Retrying with aggressive prompt...")
             aggressive_msg = prompt.template + "\n\nCRITICAL: PREVIOUS RESPONSE WAS TOO SHORT. YOU MUST BE EXTREMELY DETAILED AND WRITE OVER 1000 CHARACTERS."
             new_prompt = PromptTemplate.from_template(aggressive_msg)
             response = await _safe_invoke_async(new_prompt | llm, {"topic": topic}, feature="Grammar Rule")
             if response and response.content:
                 result = parse_json_response(response.content)

        # Prepend warning (from current call OR persistent cache)
        warning = persistent_warning or getattr(response, "_warning", "")
        if warning and isinstance(result, dict) and "description" in result:
            if warning not in result["description"]:
                result["description"] = warning + result["description"]
            
        return result
    except Exception as e:
        print(f"[LLM ERROR] Exception during generation for {topic}: {e}")
        return {"name": topic, "description": f"Lỗi hệ thống AI: {str(e)}"}


async def generate_grammar_practice(rules: List[str], difficulty: str = "Medium"):
    """Generate tailored grammar practice based on specific rules."""
    llm = get_llm(difficulty="medium")
    if not llm: return []
    
    prompt = PromptTemplate.from_template(
        "You are an expert English grammar test designer.\n"
        "Create a {difficulty} level grammar practice for these rules: {rules}.\n"
        "Include variety: Structure completion, Error correction, and Transformation.\n"
        "CRITICAL LANGUAGE RULES:\n"
        "1) question MUST be English only.\n"
        "2) options MUST be English only.\n"
        "3) answer MUST be English only.\n"
        "4) explanation should be concise Vietnamese to support learners.\n"
        "Return ONLY a valid JSON array of 10 objects with exact keys:\n"
        "{{question, options, answer, explanation}}"
    )
    print(f"[LLM GRAMMAR PRACTICE] Generating for {len(rules)} rules (Difficulty: {difficulty})...", flush=True)
    chain = prompt | llm
    try:
        response = await _safe_invoke_async(chain, {"difficulty": difficulty, "rules": ", ".join(rules)}, difficulty="medium", feature="Grammar Practice")
        result = parse_json_response(response.content)
        if not isinstance(result, list):
            return []

        normalized = []
        for item in result:
            if not isinstance(item, dict):
                continue
            question = item.get("question") or item.get("q") or ""
            options = item.get("options") if isinstance(item.get("options"), list) else []
            answer = item.get("answer") or ""
            explanation = item.get("explanation") or item.get("explanation_vn") or item.get("explanation_en") or ""
            if question and answer:
                normalized.append({
                    "question": str(question).strip(),
                    "options": [str(opt).strip() for opt in options if str(opt).strip()],
                    "answer": str(answer).strip(),
                    "explanation": str(explanation).strip(),
                })

        print(f"[LLM GRAMMAR PRACTICE] Success: generated {len(normalized)} questions", flush=True)
        return normalized
    except Exception as e:
        print(f"[LLM GRAMMAR PRACTICE] ERROR: {e}", flush=True)
        return []

async def generate_grammar_practice_stream(rules: List[str], difficulty: str = "Medium"):
    """Streaming version of generate_grammar_practice."""
    llm = get_llm(difficulty="medium")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return
    
    prompt = PromptTemplate.from_template(
        "You are an expert English grammar test designer.\n"
        "Create a {difficulty} level grammar practice for these rules: {rules}.\n"
        "Include variety: Structure completion, Error correction, and Transformation.\n"
        "CRITICAL LANGUAGE RULES:\n"
        "1) question MUST be English only.\n"
        "2) options MUST be English only.\n"
        "3) answer MUST be English only.\n"
        "4) explanation should be concise Vietnamese.\n\n"
        "Return a JSON array of 10-15 objects {{question, options, answer, explanation}}."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {"difficulty": difficulty, "rules": ", ".join(rules)}, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)


async def generate_exam_content(test_type: str, part: Optional[str] = None):
    """Generate realistic TOEIC/IELTS content (full or specific parts)."""
    llm = get_llm(difficulty="hard")
    if not llm: return {"id": "error", "error": "LLM not configured"}
    
    part_context = f"specifically for {part}" if part else "full-length"
    prompt = PromptTemplate.from_template(
        "You are an ETS/British Council exam writer. Generate a realistic {test_type} practice section, {part_context}.\n"
        "Ensure professional formatting. For TOEIC, parts 1-7. For IELTS, sections 1-4.\n"
        "Include realistic questions, options, and correct answers.\n"
        "Return a structured JSON object."
    )
    chain = prompt | llm
    try:
        response = await _safe_invoke_async(chain, {"test_type": test_type, "part_context": part_context}, difficulty="hard", feature="Exam Practice")
        return parse_json_response(response.content)
    except: return {"id": "error"}




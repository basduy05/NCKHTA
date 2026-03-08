from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
import os
import json
import sqlite3
import time
import threading
from dotenv import load_dotenv

load_dotenv()

# ─── IN-MEMORY CACHE for dictionary lookups ──────────────────────────────────
_dict_cache: dict = {}      # word -> {"data": ..., "ts": timestamp}
_cache_lock = threading.Lock()
CACHE_TTL = 3600 * 24       # 24 hours
CACHE_MAX_SIZE = 500

def _cache_get(word: str):
    """Get cached dictionary result if still valid."""
    key = word.lower().strip()
    with _cache_lock:
        entry = _dict_cache.get(key)
        if entry and (time.time() - entry["ts"]) < CACHE_TTL:
            return entry["data"]
    return None

def _cache_set(word: str, data: dict):
    """Cache dictionary result."""
    key = word.lower().strip()
    with _cache_lock:
        # Evict oldest entries if cache is full
        if len(_dict_cache) >= CACHE_MAX_SIZE:
            oldest_key = min(_dict_cache, key=lambda k: _dict_cache[k]["ts"])
            del _dict_cache[oldest_key]
        _dict_cache[key] = {"data": data, "ts": time.time()}

def _get_setting(key, default=None):
    try:
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        if row and row[0]:
            return row[0]
    except Exception:
        pass
    return os.getenv(key, default)

def parse_json_response(text: str):
    try:
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print("JSON parse error:", e)
        return []

def get_llm():
    """
    Factory to return the configured LLM instance.
    Reads API key from DB settings first, then environment variables.
    """
    google_key = _get_setting("GOOGLE_API_KEY")
    if google_key:
        os.environ["GOOGLE_API_KEY"] = google_key
        return ChatGoogleGenerativeAI(model="models/gemini-2.5-flash")

    openai_key = _get_setting("OPENAI_API_KEY")
    if openai_key:
        os.environ["OPENAI_API_KEY"] = openai_key
        return ChatOpenAI(model="gpt-3.5-turbo")

    return None

# ─── SAFE LLM INVOKE with retry ──────────────────────────────────────────────
MAX_RETRIES = 2
RETRY_DELAY = 1.5  # seconds

def _safe_invoke(chain, params: dict, retries: int = MAX_RETRIES):
    """Invoke LLM chain with automatic retry on transient failures."""
    last_error = None
    for attempt in range(retries + 1):
        try:
            response = chain.invoke(params)
            return response
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            # Don't retry on auth/quota errors
            if any(k in error_str for k in ["api_key", "quota", "unauthorized", "forbidden", "invalid"]):
                raise
            if attempt < retries:
                print(f"[LLM RETRY] Attempt {attempt + 1} failed: {e}. Retrying in {RETRY_DELAY}s...")
                time.sleep(RETRY_DELAY)
    raise last_error


def generate_flashcard_content(word: str, level: str = "A1"):
    llm = get_llm()
    if not llm:
        return {
            "word": word,
            "definition": "Definition not available (Configure API Key)",
            "example": "Example not available"
        }
        
    prompt = PromptTemplate.from_template(
        "Generate a flashcard for the English word '{word}' suitable for level '{level}'. "
        "Return strictly JSON format with keys: definition, example, synonym, antonym."
    )
    
    chain = prompt | llm
    response = _safe_invoke(chain, {"word": word, "level": level})
    return response.content

def extract_vocabulary_from_text(text: str):
    """
    Uses LLM to analyse text and extract key vocabulary words with metadata.
    Essential for the 'Input Text -> Learn' feature.
    """
    llm = get_llm()
    if not llm:
        return [{"word": "Error", "meaning": "LLM not configured"}]
        
    prompt = PromptTemplate.from_template(
        "Analyze the following English text and extract 5-10 key vocabulary words suitable for learning.\n"
        "Text: {text}\n\n"
        "For EACH word, return these EXACT JSON keys:\n"
        '- "word": the English word\n'
        '- "phonetic": IPA phonetic transcription (e.g. /əˈbaʊt/)\n'
        '- "pos": part of speech (noun, verb, adjective, etc.)\n'
        '- "meaning_vn": Vietnamese meaning\n'
        '- "meaning_en": English definition\n'
        '- "example": example sentence using the word\n'
        '- "level": CEFR level (A1/A2/B1/B2/C1/C2)\n\n'
        "Return ONLY a valid JSON array. No markdown, no explanation."
    )

    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {"text": text})
        result = parse_json_response(response.content)
        if isinstance(result, list) and len(result) > 0:
            return result
        return [{"word": "(no vocabulary found)", "meaning_vn": "Không tìm thấy từ vựng"}]
    except Exception as e:
        print(f"extract_vocabulary error: {e}")
        return [{"word": "Error", "meaning_vn": str(e)}]

def generate_quiz_from_text(text: str, num_questions: int = 5):
    """
    Generates dynamic Multiple Choice Questions based on the specific text context.
    """
    llm = get_llm()
    if not llm:
        return []
        
    prompt = PromptTemplate.from_template(
        "Generate {num} multiple-choice questions based on the vocabulary and context of this English text:\n"
        "{text}\n\n"
        "For EACH question, return these EXACT JSON keys:\n"
        '- "question": the question text\n'
        '- "options": array of exactly 4 answer choices\n'
        '- "correct_answer": the correct option (must be one of the options exactly)\n\n'
        "Return ONLY a valid JSON array. No markdown, no explanation."
    )

    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {"text": text, "num": num_questions})
        result = parse_json_response(response.content)
        if isinstance(result, list) and len(result) > 0:
            return result
        return []
    except Exception as e:
        print(f"generate_quiz error: {e}")
        return []

def generate_example_sentence(word: str, meaning: str = "", level: str = "B1"):
    llm = get_llm()
    if not llm:
        return f"Example for {word} (Auto-generated placeholder)"

    prompt = PromptTemplate.from_template(
        "Generate a short, clear English example sentence for the word '{word}' (meaning: '{meaning}') at CEFR level {level}. Return ONLY the sentence text, no quotes."
    )

    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {"word": word, "meaning": meaning, "level": level})
        return response.content
    except Exception as e:
        print(f"LLM Error: {e}")
        return f"This is an example sentence for {word}."


# ─── FREE DICTIONARY API INTEGRATION ─────────────────────────────────────────
import requests

def lookup_free_dictionary(word: str):
    """
    Look up a word using the Free Dictionary API (dictionaryapi.dev).
    Returns structured data with all meanings, phonetics, examples.
    This is FREE and has no rate limits.
    """
    try:
        url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            return None
        
        entries = resp.json()
        if not isinstance(entries, list) or len(entries) == 0:
            return None
        
        entry = entries[0]  # Primary entry
        
        # Extract phonetics
        phonetic_uk = ""
        phonetic_us = ""
        for p in entry.get("phonetics", []):
            text = p.get("text", "")
            audio = p.get("audio", "")
            if not text:
                continue
            if "uk" in audio.lower() or (not phonetic_uk and not audio):
                phonetic_uk = text
            if "us" in audio.lower() or (not phonetic_us and "uk" not in audio.lower()):
                phonetic_us = text
        if not phonetic_uk:
            phonetic_uk = entry.get("phonetic", "")
        if not phonetic_us:
            phonetic_us = phonetic_uk
        
        # Extract ALL meanings across all entries
        meanings = []
        primary_pos = ""
        for e in entries:
            for m in e.get("meanings", []):
                pos = m.get("partOfSpeech", "")
                if not primary_pos:
                    primary_pos = pos
                
                for defn in m.get("definitions", []):
                    meaning_obj = {
                        "pos": pos,
                        "definition_en": defn.get("definition", ""),
                        "definition_vn": "",  # Will be filled by AI
                        "examples": [],
                        "synonyms": defn.get("synonyms", [])[:3] or m.get("synonyms", [])[:3],
                        "antonyms": defn.get("antonyms", [])[:2] or m.get("antonyms", [])[:2],
                        "register": None,
                    }
                    if defn.get("example"):
                        meaning_obj["examples"].append(defn["example"])
                    meanings.append(meaning_obj)
        
        if not meanings:
            return None
        
        return {
            "word": word,
            "phonetic_uk": phonetic_uk,
            "phonetic_us": phonetic_us,
            "pos": primary_pos,
            "meanings": meanings,
            "level": "",  # Will be estimated by AI
            "word_family": [],
            "collocations": [],
            "sources": ["Free Dictionary API (Wiktionary)"],
            "_needs_translation": True,  # Flag: needs Vietnamese translation
        }
    except Exception as e:
        print(f"[Free Dictionary API] Error: {e}")
        return None


def translate_meanings_with_ai(word: str, meanings: list, estimate_level: bool = True):
    """
    Use AI ONLY to translate English definitions to Vietnamese.
    Much cheaper than generating all dictionary data from scratch.
    """
    llm = get_llm()
    if not llm:
        return meanings, "B1"
    
    # Build compact translation request
    definitions_text = "\n".join(
        f"{i+1}. [{m.get('pos', '')}] {m.get('definition_en', '')}"
        for i, m in enumerate(meanings[:15])  # Limit to 15 meanings
    )
    
    prompt = PromptTemplate.from_template(
        "Translate these English definitions of the word '{word}' to Vietnamese.\n"
        "Also estimate the CEFR level (A1/A2/B1/B2/C1/C2) of this word.\n\n"
        "Definitions:\n{definitions}\n\n"
        "Return ONLY a JSON object with:\n"
        '- "translations": array of Vietnamese translations (same order as input)\n'
        '- "level": CEFR level estimate\n'
        '- "word_family": array of 3-5 related word forms\n'
        '- "collocations": array of 4-6 common collocations\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    
    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {"word": word, "definitions": definitions_text})
        result = parse_json_response(response.content)
        
        if isinstance(result, dict):
            translations = result.get("translations", [])
            for i, meaning in enumerate(meanings[:15]):
                if i < len(translations):
                    meaning["definition_vn"] = translations[i]
            level = result.get("level", "B1")
            word_family = result.get("word_family", [])
            collocations = result.get("collocations", [])
            return meanings, level, word_family, collocations
    except Exception as e:
        print(f"[AI Translation] Error: {e}")
    
    return meanings, "B1", [], []


def lookup_dictionary_full_ai(word: str):
    """
    Full AI-powered dictionary lookup (fallback when Free API has no results).
    Used for abbreviations, slang, proper nouns, etc.
    """
    llm = get_llm()
    if not llm:
        return {"word": word, "error": "LLM not configured"}

    prompt = PromptTemplate.from_template(
        "You are an advanced English dictionary combining data from Cambridge Dictionary, "
        "Oxford Advanced Learner's Dictionary, and Longman Dictionary of Contemporary English.\n"
        "Look up the English word/term: '{word}'\n\n"
        "IMPORTANT RULES:\n"
        "1. Provide ALL distinct meanings/senses (at least 3-5 if the word has multiple senses)\n"
        "2. Cover ALL different parts of speech (noun, verb, adjective, etc.)\n"
        "3. If the word is an ABBREVIATION (like IT, AI, USA), include its full form as the FIRST meaning\n"
        "4. If the word has BOTH a common meaning AND an abbreviation meaning, include BOTH\n"
        "5. Each meaning must be a separate entry in the meanings array\n\n"
        "Return a JSON object with these EXACT keys:\n"
        '"word": the word (preserve original casing)\n'
        '"phonetic_uk": UK IPA pronunciation\n'
        '"phonetic_us": US IPA pronunciation\n'
        '"pos": primary part of speech\n'
        '"meanings": array of objects, each with:\n'
        '  "pos": part of speech\n'
        '  "definition_en": English definition\n'
        '  "definition_vn": Vietnamese translation\n'
        '  "examples": array of 2-3 example sentences\n'
        '  "synonyms": array of 2-3 synonyms\n'
        '  "antonyms": array (empty if none)\n'
        '  "register": formal/informal/slang/technical or null\n'
        '"level": CEFR level (A1-C2)\n'
        '"word_family": array of related word forms\n'
        '"collocations": array of 4-6 common collocations\n'
        '"sources": ["Cambridge Dictionary", "Oxford Advanced Learner\'s Dictionary", "Longman Dictionary"]\n\n'
        "Return ONLY valid JSON. No markdown, no extra text."
    )

    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {"word": word})
        result = parse_json_response(response.content)
        if isinstance(result, dict) and "word" in result:
            _cache_set(word, result)
            return result
        return {"word": word, "error": "Could not parse dictionary data"}
    except Exception as e:
        print(f"lookup_dictionary_full_ai error: {e}")
        return {"word": word, "error": str(e)}


def lookup_dictionary(word: str):
    """
    Hybrid dictionary lookup:
    1. Try Free Dictionary API first (free, accurate English data)
    2. Use AI only for Vietnamese translation (saves 70-80% AI cost)
    3. Fallback to full AI if Free API doesn't have the word
    
    Uses in-memory cache for fast repeated lookups.
    """
    # Check cache first
    cached = _cache_get(word)
    if cached:
        cached["_from_cache"] = True
        return cached

    # Step 1: Try Free Dictionary API (free, comprehensive English data)
    free_data = lookup_free_dictionary(word)
    
    if free_data and len(free_data.get("meanings", [])) > 0:
        # Step 2: Use AI only for translation (much cheaper)
        meanings, level, word_family, collocations = translate_meanings_with_ai(
            word, free_data["meanings"]
        )
        free_data["meanings"] = meanings
        free_data["level"] = level
        free_data["word_family"] = word_family
        free_data["collocations"] = collocations
        free_data["sources"] = ["Free Dictionary API (Wiktionary)", "AI Translation"]
        free_data.pop("_needs_translation", None)
        
        _cache_set(word, free_data)
        return free_data
    
    # Step 3: Fallback to full AI (for abbreviations, slang, proper nouns)
    result = lookup_dictionary_full_ai(word)
    if not result.get("error"):
        _cache_set(word, result)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# NEW FEATURES: IPA, File Exercises, TOEIC/IELTS, Reading, Writing, Speaking
# ═══════════════════════════════════════════════════════════════════════════════

def generate_ipa_lesson(words: list = None, focus: str = "vowels"):
    """Generate an IPA learning lesson with interactive exercises."""
    llm = get_llm()
    if not llm:
        return {"error": "LLM not configured"}

    words_text = ", ".join(words[:10]) if words else ""
    prompt = PromptTemplate.from_template(
        "You are an expert English phonetics teacher.\n"
        "Create an IPA (International Phonetic Alphabet) lesson focused on: {focus}\n"
        "{words_context}\n\n"
        "Return a JSON object with:\n"
        '"lesson_title": catchy title\n'
        '"introduction": brief explanation of the IPA sounds covered (2-3 sentences)\n'
        '"sounds": array of 6-8 IPA sound objects, each with:\n'
        '  "symbol": IPA symbol (e.g. /iː/)\n'
        '  "name": sound name (e.g. "long ee")\n'
        '  "description": how to produce the sound\n'
        '  "example_words": array of 3 words with this sound\n'
        '  "example_ipa": array of corresponding IPA transcriptions\n'
        '"minimal_pairs": array of 4-6 minimal pair exercises, each with:\n'
        '  "word1": first word\n'
        '  "word2": second word (differs by one sound)\n'
        '  "ipa1": IPA of word1\n'
        '  "ipa2": IPA of word2\n'
        '  "sound_difference": which sound changes\n'
        '"practice_sentences": array of 3-4 sentences focused on target sounds, each with:\n'
        '  "sentence": the sentence text\n'
        '  "ipa": full IPA transcription\n'
        '  "focus_words": array of words containing target sounds\n'
        '"quiz": array of 5 MCQ questions testing IPA knowledge, each with:\n"question": question text\n'
        '  "options": 4 options\n'
        '  "correct_answer": the correct option\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    words_context = f"Include these words in examples if possible: {words_text}" if words_text else ""
    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {"focus": focus, "words_context": words_context})
        result = parse_json_response(response.content)
        if isinstance(result, dict):
            return result
        return {"error": "Could not parse IPA lesson"}
    except Exception as e:
        print(f"generate_ipa_lesson error: {e}")
        return {"error": str(e)}


def generate_exercises_from_text(text: str, exercise_type: str = "mixed", num_questions: int = 10):
    """Generate exercises from extracted file text. Supports: quiz, fill-blanks, matching, mixed."""
    llm = get_llm()
    if not llm:
        return {"error": "LLM not configured"}

    # Truncate long texts
    text_truncated = text[:3000] if len(text) > 3000 else text

    prompt = PromptTemplate.from_template(
        "You are an English teacher creating exercises from the following text.\n\n"
        "TEXT:\n{text}\n\n"
        "Create {num} exercises of type: {exercise_type}\n\n"
        "Return a JSON object with:\n"
        '"title": suggested exercise title\n'
        '"difficulty": estimated CEFR level (A1-C2)\n'
        '"vocabulary": array of 5-8 key words from the text, each with:\n'
        '  "word": the word\n'
        '  "meaning_vn": Vietnamese meaning\n'
        '  "pos": part of speech\n'
        '"exercises": array of exercise objects, each with:\n'
        '  "type": "mcq" or "fill_blank" or "true_false" or "matching"\n'
        '  "question": the question/prompt\n'
        '  "options": array of choices (for mcq, true_false)\n'
        '  "correct_answer": the correct answer\n'
        '  "explanation": brief explanation why this is correct\n'
        '"summary_vn": Vietnamese summary of the text (2-3 sentences)\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {
            "text": text_truncated,
            "exercise_type": exercise_type,
            "num": num_questions,
        })
        result = parse_json_response(response.content)
        if isinstance(result, dict):
            return result
        return {"error": "Could not generate exercises"}
    except Exception as e:
        print(f"generate_exercises_from_text error: {e}")
        return {"error": str(e)}


def generate_practice_test(test_type: str = "TOEIC", skill: str = "reading", part: str = ""):
    """Generate TOEIC/IELTS practice test questions."""
    llm = get_llm()
    if not llm:
        return {"error": "LLM not configured"}

    prompt = PromptTemplate.from_template(
        "You are an expert {test_type} exam preparation tutor.\n"
        "Generate a practice section for: {test_type} - {skill} {part}\n\n"
        "Return a JSON object with:\n"
        '"test_type": "{test_type}"\n'
        '"skill": "{skill}"\n'
        '"part": description of which part\n'
        '"time_limit": suggested time in minutes\n'
        '"instructions": brief instructions in Vietnamese\n'
        '"passage": reading/listening passage text (if applicable, 150-300 words)\n'
        '"questions": array of 5-8 question objects, each with:\n'
        '  "number": question number\n'
        '  "question": question text\n'
        '  "type": "mcq" or "fill_blank" or "true_false_not_given"\n'
        '  "options": array of 4 choices (for mcq)\n'
        '  "correct_answer": correct answer\n'
        '  "explanation": why this is correct (in Vietnamese)\n'
        '"tips": array of 2-3 exam tips in Vietnamese\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {
            "test_type": test_type,
            "skill": skill,
            "part": part or "general",
        })
        result = parse_json_response(response.content)
        if isinstance(result, dict):
            return result
        return {"error": "Could not generate practice test"}
    except Exception as e:
        print(f"generate_practice_test error: {e}")
        return {"error": str(e)}


def generate_reading_passage(topic: str = "", level: str = "B1"):
    """Generate a reading passage with comprehension questions."""
    llm = get_llm()
    if not llm:
        return {"error": "LLM not configured"}

    prompt = PromptTemplate.from_template(
        "Generate an English reading comprehension exercise at CEFR level {level}.\n"
        "Topic: {topic}\n\n"
        "Return a JSON object with:\n"
        '"title": passage title\n'
        '"passage": the reading passage (200-400 words, CEFR {level})\n'
        '"word_count": number of words\n'
        '"key_vocabulary": array of 5-6 important words, each with:\n'
        '  "word": the word\n'
        '  "meaning_vn": Vietnamese meaning\n'
        '  "in_context": the sentence from passage containing this word\n'
        '"questions": array of 5-6 comprehension questions, each with:\n'
        '  "type": "mcq" or "true_false" or "short_answer"\n'
        '  "question": question text\n'
        '  "options": array of 4 choices (for mcq)\n'
        '  "correct_answer": correct answer\n'
        '  "explanation_vn": explanation in Vietnamese\n'
        '"summary_vn": Vietnamese summary of the passage\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {
            "level": level,
            "topic": topic or "an interesting general topic",
        })
        result = parse_json_response(response.content)
        if isinstance(result, dict):
            return result
        return {"error": "Could not generate reading passage"}
    except Exception as e:
        print(f"generate_reading_passage error: {e}")
        return {"error": str(e)}


def evaluate_writing(text: str, task_type: str = "essay", target_test: str = "IELTS"):
    """Evaluate writing using IELTS/TOEIC criteria. Returns band score + detailed feedback."""
    llm = get_llm()
    if not llm:
        return {"error": "LLM not configured"}

    prompt = PromptTemplate.from_template(
        "You are an expert {target_test} writing examiner.\n"
        "Evaluate the following {task_type} writing:\n\n"
        "STUDENT'S WRITING:\n{text}\n\n"
        "Evaluate based on these criteria and return a JSON object:\n"
        '"overall_band": overall band score (1-9 for IELTS, or percentage)\n'
        '"word_count": actual word count\n'
        '"criteria": object with scores for each criterion:\n'
        '  "task_achievement": {{"score": number, "feedback_vn": detailed feedback in Vietnamese}}\n'
        '  "coherence_cohesion": {{"score": number, "feedback_vn": detailed feedback}}\n'
        '  "lexical_resource": {{"score": number, "feedback_vn": detailed feedback}}\n'
        '  "grammar_accuracy": {{"score": number, "feedback_vn": detailed feedback}}\n'
        '"strengths": array of 2-3 strengths in Vietnamese\n'
        '"improvements": array of 3-4 specific suggestions for improvement in Vietnamese\n'
        '"corrected_sentences": array of objects showing corrections:\n'
        '  "original": student\'s sentence\n'
        '  "corrected": corrected version\n'
        '  "explanation_vn": explanation of the correction\n'
        '"model_paragraph": a short model paragraph showing ideal writing for comparison\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {
            "text": text[:2000],
            "task_type": task_type,
            "target_test": target_test,
        })
        result = parse_json_response(response.content)
        if isinstance(result, dict):
            return result
        return {"error": "Could not evaluate writing"}
    except Exception as e:
        print(f"evaluate_writing error: {e}")
        return {"error": str(e)}


def generate_speaking_topic(level: str = "B1", topic_type: str = "general"):
    """Generate speaking practice topics with model answers."""
    llm = get_llm()
    if not llm:
        return {"error": "LLM not configured"}

    prompt = PromptTemplate.from_template(
        "Generate an English speaking practice exercise at CEFR level {level}.\n"
        "Topic type: {topic_type}\n\n"
        "Return a JSON object with:\n"
        '"topic": the main speaking topic/question\n'
        '"preparation_time": seconds to prepare (30-60)\n'
        '"speaking_time": seconds to speak (60-120)\n'
        '"sub_questions": array of 3-4 follow-up questions to guide the speaker\n'
        '"useful_vocabulary": array of 6-8 useful words/phrases, each with:\n'
        '  "phrase": the word/phrase\n'
        '  "meaning_vn": Vietnamese meaning\n'
        '  "usage_example": example sentence\n'
        '"model_answer": a model response (100-150 words)\n'
        '"tips_vn": array of 3-4 speaking tips in Vietnamese\n'
        '"evaluation_criteria": array of criteria to self-assess:\n'
        '  "criterion": name\n'
        '  "description_vn": description in Vietnamese\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {"level": level, "topic_type": topic_type})
        result = parse_json_response(response.content)
        if isinstance(result, dict):
            return result
        return {"error": "Could not generate speaking topic"}
    except Exception as e:
        print(f"generate_speaking_topic error: {e}")
        return {"error": str(e)}

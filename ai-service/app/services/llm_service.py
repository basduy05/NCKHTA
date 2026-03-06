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


def lookup_dictionary(word: str):
    """
    AI-powered dictionary lookup combining Cambridge/Oxford style data.
    Returns comprehensive word data. Uses in-memory cache.
    """
    # Check cache first
    cached = _cache_get(word)
    if cached:
        cached["_from_cache"] = True
        return cached

    llm = get_llm()
    if not llm:
        return {"word": word, "error": "LLM not configured"}

    prompt = PromptTemplate.from_template(
        "You are an advanced English dictionary combining data from Cambridge Dictionary, "
        "Oxford Advanced Learner's Dictionary, and Longman Dictionary of Contemporary English.\n"
        "Look up the English word: '{word}'\n\n"
        "IMPORTANT: Provide ALL distinct meanings/senses of the word (at least 3-5 if the word has "
        "multiple senses). Cover different parts of speech (noun, verb, adjective, etc.) and "
        "different usage contexts. Each meaning should be a separate entry.\n\n"
        "Return a JSON object with these EXACT keys:\n"
        '- "word": the word\n'
        '- "phonetic_uk": UK IPA pronunciation (e.g. /ˈwɜː.tər/)\n'
        '- "phonetic_us": US IPA pronunciation (e.g. /ˈwɝː.t̬ɚ/)\n'
        '- "pos": primary part of speech\n'
        '- "meanings": array of 3-5+ objects (one per distinct sense), each with:\n'
        '    - "pos": part of speech for this meaning (noun, verb, adj, adv, etc.)\n'
        '    - "definition_en": clear English definition from that sense\n'
        '    - "definition_vn": accurate Vietnamese translation\n'
        '    - "examples": array of 2-3 natural example sentences showing this specific sense\n'
        '    - "synonyms": array of 2-3 synonyms specific to this sense\n'
        '    - "antonyms": array of 1-2 antonyms (if applicable, else empty array)\n'
        '    - "register": usage register if notable (formal/informal/slang/literary, else null)\n'
        '- "level": CEFR level (A1/A2/B1/B2/C1/C2)\n'
        '- "word_family": array of related word forms (e.g. ["beauty", "beautiful", "beautifully", "beautify"])\n'
        '- "collocations": array of 4-6 common collocations\n'
        '- "sources": ["Cambridge Dictionary", "Oxford Advanced Learner\'s Dictionary", "Longman Dictionary"]\n\n'
        "Return ONLY valid JSON. No markdown, no extra text."
    )

    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {"word": word})
        result = parse_json_response(response.content)
        if isinstance(result, dict) and "word" in result:
            _cache_set(word, result)  # Cache successful result
            return result
        return {"word": word, "error": "Could not parse dictionary data"}
    except Exception as e:
        print(f"lookup_dictionary error: {e}")
        return {"word": word, "error": str(e)}


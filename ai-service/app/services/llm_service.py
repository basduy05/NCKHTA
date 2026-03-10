from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_cohere import ChatCohere
from langchain_core.prompts import PromptTemplate
import os
import json
import sqlite3
import time
import threading
from dotenv import load_dotenv
import re
import json_repair
from ..database import get_db, get_cached_dictionary, set_cached_dictionary

load_dotenv()

# ─── IN-MEMORY CACHE for dictionary lookups ──────────────────────────────────
_dict_cache: dict = {}      # word -> {"data": ..., "ts": timestamp}
_cache_lock = threading.Lock()
CACHE_TTL = 3600 * 24       # 24 hours
CACHE_MAX_SIZE = 500

# ─── IN-MEMORY CACHE for settings ──────────────────────────────────────────
_settings_cache: dict = {}
_settings_lock = threading.Lock()
SETTINGS_TTL = 300  # 5 minutes

def _cache_get(word: str):
    """Get cached dictionary result if still valid (Memory -> DB)."""
    key = word.lower().strip()
    
    # 1. Memory Cache
    with _cache_lock:
        entry = _dict_cache.get(key)
        if entry and (time.time() - entry["ts"]) < CACHE_TTL:
            return entry["data"]
                
    # 2. Database Cache
    db_cached = get_cached_dictionary(key)
    if db_cached:
        if isinstance(db_cached, dict):
            db_cached["_from_cache"] = True
        # Update memory cache
        with _cache_lock:
            _dict_cache[key] = {"data": db_cached, "ts": time.time()}
        return db_cached
        
    return None

def _cache_set(word: str, data: dict):
    """Save dictionary result to both memory and DB."""
    key = word.lower().strip()
    
    # 1. Memory Cache
    with _cache_lock:
        if len(_dict_cache) >= CACHE_MAX_SIZE:
            oldest_key = min(_dict_cache, key=lambda k: _dict_cache[k]["ts"])
            del _dict_cache[oldest_key]
        _dict_cache[key] = {"data": data, "ts": time.time()}
        
    # 2. Database Cache
    set_cached_dictionary(key, data)


def is_data_complete(data: dict) -> bool:
    """Check if dictionary data has all required fields filled.
    Returns False if data is missing critical information and should be re-looked up.
    
    NOTE: This function decides whether cached data is "complete enough" to use.
    We should be lenient - core data (meanings with translations) is essential,
    but additional fields (idioms, collocations, register) can be enriched later."""
    if not data or not isinstance(data, dict):
        return False
    meanings = data.get("meanings", [])
    if not meanings or len(meanings) == 0:
        return False
        
    # Check that ALL meanings have VN translation, EN definition, and examples (CRITICAL)
    missing_vn = any(not m.get("definition_vn") for m in meanings)
    missing_en = any(not m.get("definition_en") for m in meanings)
    missing_examples = any(not m.get("examples") or len(m.get("examples", [])) == 0 for m in meanings)
    
    # Check phonetics (important)
    has_phonetic = bool(data.get("phonetic_uk") or data.get("phonetic_us"))
    
    # Level is helpful but not required for basic functionality
    has_level = bool(data.get("level") and data.get("level") in ("A1", "A2", "B1", "B2", "C1", "C2"))
    
    # Additional fields (idioms, collocations, register) - these are ENRICHMENT, not required
    # Don't block caching just because these are missing - they can be added later
    # Old cached data without these fields should still be usable
    
    # CORE REQUIREMENTS: meanings with translations + examples + phonetic
    # These are the minimum for a usable dictionary entry
    return (not missing_vn) and (not missing_en) and (not missing_examples) and has_phonetic

def _get_setting(key, default=None):
    # 1. Check in-memory cache
    now = time.time()
    with _settings_lock:
        if key in _settings_cache:
            val, ts = _settings_cache[key]
            if now - ts < SETTINGS_TTL:
                return val

    # 2. Check DB using consolidated get_db
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        
        val = None
        if row and row["value"]:
            val = row["value"]
        else:
            val = os.getenv(key, default)
            
        # Update cache
        with _settings_lock:
            _settings_cache[key] = (val, now)
        return val
    except Exception as e:
        print(f"[LLM SETTING] Error fetching '{key}': {e}")
        return os.getenv(key, default)


def parse_json_response(text):
    try:
        if not text:
            return []
        if isinstance(text, (list, dict)):
            return text
        
        # Try to find JSON block using regex if there's surrounding text
        # If it's a string, we strip it
        text_str = str(text).strip()
        match = re.search(r'\{.*\}|\[.*\]', text_str, re.DOTALL)
        if match:
            text_str = match.group(0)
            
        return json.loads(text_str)
    except Exception as e:
        print("JSON parse error:", e)
        # print("Raw text was:", text[:200] + "...")
        return []

def get_llm(provider=None):
    """
    Factory to return the configured LLM instance.
    Reads API key from DB settings first, then environment variables.
    If provider is specified ("google", "openai", "cohere"), only return that provider.
    Default order: Google Gemini → OpenAI → Cohere.
    """
    if provider != "cohere" and provider != "openai":
        google_key = _get_setting("GOOGLE_API_KEY")
        if google_key and provider in (None, "google"):
            os.environ["GOOGLE_API_KEY"] = google_key
            # Use faster gemini-1.5-flash model instead of gemini-pro-latest
            return ChatGoogleGenerativeAI(model="gemini-2.5-flash", timeout=30)

    if provider != "google" and provider != "cohere":
        openai_key = _get_setting("OPENAI_API_KEY")
        if openai_key and provider in (None, "openai"):
            os.environ["OPENAI_API_KEY"] = openai_key
            return ChatOpenAI(model="gpt-3.5-turbo")

    cohere_key = _get_setting("COHERE_API_KEY")
    if cohere_key and provider in (None, "cohere"):
        os.environ["COHERE_API_KEY"] = cohere_key
        # Use command-r as previous 'command' model was deprecated
        return ChatCohere(model="command-r")

    return None

# ─── SAFE LLM INVOKE with retry ──────────────────────────────────────────────
MAX_RETRIES = 1
RETRY_DELAY = 0.5  # seconds

def _safe_invoke(chain, params: dict, retries: int = MAX_RETRIES):
    """Invoke LLM chain with automatic retry on transient failures and fallback to Cohere."""
    last_error = None
    
    # First attempt with the primary chain
    for attempt in range(retries + 1):
        try:
            response = chain.invoke(params)
            return response
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            
            # If it's a quota/rate limit error, fallback to Cohere
            if any(k in error_str for k in ["quota", "rate_limit", "resource_exhausted", "429", "too many requests", "503"]):
                print(f"[LLM QUOTA] Primary LLM quota or rate limit exceeded: {e}. Falling back to Cohere...")
                fallback_llm = get_llm(provider="cohere")
                if fallback_llm:
                    # We need to recreate the chain with the fallback LLM
                    # The chain is typically a RunnableSequence (prompt | llm)
                    # We can access the first part (prompt) from the existing chain
                    if hasattr(chain, 'first'):
                        fallback_chain = chain.first | fallback_llm
                        try:
                            return fallback_chain.invoke(params)
                        except Exception as fallback_error:
                            print(f"[LLM FALLBACK FAILED] Cohere also failed: {fallback_error}")
                            last_error = fallback_error
                            raise fallback_error
                    else:
                        print("[LLM FALLBACK FAILED] Could not extract prompt from chain for fallback.")
                        raise e
                else:
                    print("[LLM FALLBACK FAILED] Cohere API key not configured or available.")
                    raise e
                    
            # Don't retry on auth errors
            if any(k in error_str for k in ["api_key", "unauthorized", "forbidden", "invalid"]):
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
    start_time = time.time()
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
        audio_url = ""
        for p in entry.get("phonetics", []):
            text = p.get("text", "")
            audio = p.get("audio", "")
            if audio and not audio_url:
                audio_url = audio  # Take the first available audio
            if not text:
                continue
            if "uk" in audio.lower() or (not phonetic_uk and not audio):
                phonetic_uk = text
            if "us" in audio.lower() or (not phonetic_us and "uk" not in audio.lower()):
                phonetic_us = text
                if audio:
                     audio_url = audio # Prefer US audio if available
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
            "audio_url": audio_url,
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
    finally:
        if 'start_time' in locals():
             print(f"[LATENCY] lookup_free_dictionary for '{word}' took {time.time() - start_time:.2f}s")



def lookup_wikipedia(word: str) -> dict:
    """
    Look up a word using Wikipedia API (FREE, no API key needed).
    Returns summary and additional information from Wikipedia.
    """
    try:
        # Use Wikipedia REST API (free, no key required)
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{word.lower()}"
        resp = requests.get(url, timeout=10)
        
        if resp.status_code != 200:
            # Try with disambiguation
            url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={word}&limit=1&format=json"
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if len(data) > 1 and len(data[1]) > 0:
                    # Get first result
                    title = data[1][0]
                    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
                    resp = requests.get(url, timeout=10)
                else:
                    return None
            else:
                return None
        
        data = resp.json()
        
        return {
            "title": data.get("title", ""),
            "extract": data.get("extract", ""),  # Summary text
            "description": data.get("description", ""),
            "thumbnail": data.get("thumbnail", {}).get("source", "") if data.get("thumbnail") else "",
            "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            "wikipedia_source": True
        }
    except Exception as e:
        print(f"[Wikipedia API] Error: {e}")
        return None

def translate_meanings_with_ai(word: str, meanings: list, estimate_level: bool = True):
    start_time = time.time()
    """
    Use AI as multi-source lexicographer (Cambridge, Oxford, Merriam-Webster, Longman, Urban Dictionary)
    to translate, consolidate, and enrich raw Free Dictionary API data.
    Adds: register (formal/informal/slang), frequency, usage_notes, idioms.
    """
    llm = get_llm()
    if not llm:
        return meanings, "B1", [], [], []
    
    # Build compact representation of all meanings from Free API
    definitions_text = "\n".join(
        f"{i+1}. [{m.get('pos', '')}] {m.get('definition_en', '')} (Examples: {m.get('examples', [])})"
        for i, m in enumerate(meanings[:20])
    )
    
    prompt = PromptTemplate.from_template(
        "You are an expert bilingual lexicographer combining knowledge from Cambridge Dictionary, "
        "Oxford Advanced Learner's Dictionary, Merriam-Webster, Longman, Collins, Macmillan, "
        "and Urban Dictionary (for slang/informal usage).\n"
        "I have raw dictionary meanings for the English word '{word}'.\n"
        "Your task is to consolidate into 4-6 distinct grouped meanings, BUT also ADD any important "
        "meanings that are MISSING from the raw data (especially slang, informal, or specialized meanings).\n\n"
        "Raw Definitions:\n{definitions}\n\n"
        "For EACH distinct meaning, provide ALL of these fields (NEVER leave any empty):\n"
        "1. 'pos' — part of speech\n"
        "2. 'definition_en' — clean English definition\n"
        "3. 'definition_vn' — natural Vietnamese translation\n"
        "4. 'examples' — 2-3 realistic example sentences. MUST have at least 2.\n"
        "5. 'synonyms' — 3-5 synonyms\n"
        "6. 'antonyms' — 2-3 antonyms (empty array if none)\n"
        "7. 'register' — one of: 'formal', 'informal', 'slang', 'technical', 'literary', 'neutral'\n"
        "8. 'usage_notes' — brief note on when/how to use this meaning (e.g. 'common in spoken English')\n\n"
        "Also provide:\n"
        "- 'level': CEFR level (A1-C2)\n"
        "- 'frequency': 'very common', 'common', 'uncommon', or 'rare'\n"
        "- 'word_family': 5-8 related word forms (e.g. run → runner, running, ran)\n"
        "- 'collocations': 5-8 common collocations\n"
        "- 'idioms': 2-4 idioms with Vietnamese translations\n\n"
        "Return EXACTLY a JSON object:\n"
        '{{\n'
        '  "meanings": [{{"pos": "...", "definition_en": "...", "definition_vn": "...", '
        '"examples": ["..."], "synonyms": ["..."], "antonyms": ["..."], '
        '"register": "neutral", "usage_notes": "..."}}],\n'
        '  "level": "B1",\n'
        '  "frequency": "common",\n'
        '  "word_family": ["..."],\n'
        '  "collocations": ["..."],\n'
        '  "idioms": [{{"idiom": "...", "meaning_vn": "..."}}]\n'
        '}}\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    
    chain = prompt | llm
    try:
        try:
            response = _safe_invoke(chain, {"word": word, "definitions": definitions_text})
        except Exception as e:
            error_str = str(e).lower()
            if any(k in error_str for k in ["quota", "rate_limit", "resource_exhausted", "429", "too many requests"]):
                print(f"[LLM QUOTA] Primary LLM quota exceeded. Retrying with Cohere in translate_meanings...")
                fallback_llm = get_llm(provider="cohere")
                if fallback_llm:
                    chain = prompt | fallback_llm
                    response = _safe_invoke(chain, {"word": word, "definitions": definitions_text})
                else:
                    raise e
            else:
                raise e

        result = parse_json_response(response.content)
        
        if isinstance(result, dict) and "meanings" in result:
            return (
                result["meanings"],
                result.get("level", "B1"),
                result.get("word_family", []) or [],
                result.get("collocations", []) or [],
                result.get("idioms", []) or []
            )
        elif isinstance(result, list) and len(result) > 0:
            # If result is a list of meanings, use it directly
            return (
                result,
                "B1",
                [],
                [],
                []
            )
    except Exception as e:
        print(f"[AI Translation & Consolidation] Error: {e}")
    finally:
        print(f"[LATENCY] translate_meanings_with_ai for '{word}' took {time.time() - start_time:.2f}s")
    
    # Return original meanings with defaults instead of empty arrays
    return meanings, "B1", [], [], []

def translate_meanings_with_ai_stream(word: str, meanings: list, free_data: dict = None, estimate_level: bool = True):
    """
    Streaming version of translate_meanings_with_ai. Yields JSON chunks as they arrive.
    Takes optional free_data to preserve phonetics and other metadata from Free Dictionary API.
    """
    start_time = time.time()
    llm = get_llm()
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return
    
    # Get phonetics from free_data if available
    phonetic_uk = free_data.get("phonetic_uk", "") if free_data else ""
    phonetic_us = free_data.get("phonetic_us", "") if free_data else ""
    audio_url = free_data.get("audio_url", "") if free_data else ""
    
    definitions_text = "\n".join(
        f"{i+1}. [{m.get('pos', '')}] {m.get('definition_en', '')} (Examples: {m.get('examples', [])})"
        for i, m in enumerate(meanings[:20])
    )
    
    # Full comprehensive prompt for complete vocabulary data
    prompt = PromptTemplate.from_template(
        "You are an expert bilingual lexicographer combining knowledge from Cambridge Dictionary, "
        "Oxford Advanced Learner's Dictionary, Merriam-Webster, Longman, Collins, Macmillan, "
        "and Urban Dictionary (for slang/informal usage).\n"
        "I have raw dictionary meanings for the English word '{word}'.\n"
        "Your task is to consolidate into 4-6 distinct grouped meanings, BUT also ADD any important "
        "meanings that are MISSING from the raw data (especially slang, informal, or specialized meanings).\n\n"
        "Raw Definitions:\n{definitions}\n\n"
        "For EACH distinct meaning, provide ALL of these fields (NEVER leave any empty):\n"
        "1. 'pos' — part of speech\n"
        "2. 'definition_en' — clean English definition\n"
        "3. 'definition_vn' — natural Vietnamese translation\n"
        "4. 'examples' — 2-3 realistic example sentences with Vietnamese translation. MUST have at least 2.\n"
        "5. 'synonyms' — 3-5 synonyms\n"
        "6. 'antonyms' — 2-3 antonyms (empty array if none)\n"
        "7. 'register' — one of: 'formal', 'informal', 'slang', 'technical', 'literary', 'neutral'\n"
        "8. 'usage_notes' — brief note on when/how to use this meaning (e.g. 'common in spoken English')\n\n"
        "Also provide:\n"
        "- 'phonetic_uk' — UK phonetic pronunciation (e.g. /kəmˈpjuːtər/)\n"
        "- 'phonetic_us' — US phonetic pronunciation (e.g. /kəmˈpjuːtər/)\n"
        "- 'audio_url_uk' — URL to UK pronunciation audio (from dictionaryapi.dev if available)\n"
        "- 'audio_url_us' — URL to US pronunciation audio (from dictionaryapi.dev if available)\n"
        "- 'level': CEFR level (A1-C2)\n"
        "- 'frequency': 'very common', 'common', 'uncommon', or 'rare'\n"
        "- 'word_family': 5-8 related word forms (e.g. run → runner, running, ran)\n"
        "- 'collocations': 5-8 common collocations with example sentences\n"
        "- 'idioms': 2-4 idioms with Vietnamese translations\n"
        "- 'notes': additional notes about usage\n\n"
        "Return EXACTLY a JSON object:\n"
        '{{\n'
        '  "word": "...",\n'
        '  "phonetic_uk": "...",\n'
        '  "phonetic_us": "...",\n'
        '  "audio_url_uk": "...",\n'
        '  "audio_url_us": "...",\n'
        '  "meanings": [{{"pos": "...", "definition_en": "...", "definition_vn": "...", '
        '"examples": ["..."], "examples_vn": ["..."], "synonyms": ["..."], "antonyms": ["..."], '
        '"register": "neutral", "usage_notes": "..."}}],\n'
        '  "level": "B1",\n'
        '  "frequency": "common",\n'
        '  "word_family": ["..."],\n'
        '  "collocations": ["..."],\n'
        '  "idioms": [{{"idiom": "...", "meaning_vn": "...", "example": "..."}}],\n'
        '  "notes": "...",\n'
        '  "sources": ["Cambridge Dictionary", "Oxford Advanced Learner", "Merriam-Webster", "Longman", "Urban Dictionary"]\n'
        '}}\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    
    chain = prompt | llm
    
    def _safe_stream_invoke(chain_to_use, params, llm_name="Primary"):
        try:
            for chunk in chain_to_use.stream(params):
                yield chunk.content
        except Exception as e:
            error_str = str(e).lower()
            if any(k in error_str for k in ["quota", "rate_limit", "resource_exhausted", "429", "too many requests", "503"]):
                if llm_name == "Primary":
                    print(f"[LLM QUOTA] Primary LLM quota exceeded in stream. Falling back to Cohere...")
                    fallback_llm = get_llm(provider="cohere")
                    if fallback_llm and hasattr(chain_to_use, 'first'):
                        fallback_chain = chain_to_use.first | fallback_llm
                        yield from _safe_stream_invoke(fallback_chain, params, llm_name="Cohere")
                        return
            raise e

    try:
        accumulated_text = ""
        last_yielded_json = ""
        
        for content in _safe_stream_invoke(chain, {"word": word, "definitions": definitions_text}):
            if content:
                accumulated_text += content
                elapsed = time.time() - start_time
                
                # Yield raw thinking chunk
                yield json.dumps({
                    "status": "thinking", 
                    "chunk": content, 
                    "full_thinking": accumulated_text,
                    "elapsed": round(elapsed, 1)
                }, ensure_ascii=False) + "\n"
                
                # Cố gắng repair json từ text accumulate
                try:
                    repaired = json_repair.repair_json(accumulated_text, return_objects=True)
                    if isinstance(repaired, dict) and "meanings" in repaired:
                        # Gắn thêm trường metadata
                        repaired["status"] = "result"
                        repaired["_source"] = "ai"  # Mark as AI-generated
                        repaired["_raw_thinking_stream"] = accumulated_text
                        repaired["elapsed"] = round(elapsed, 1)
                        
                        # Bổ sung phonetics từ Free Dictionary API nếu AI không trả về
                        if free_data:
                            # UK phonetics
                            if not repaired.get("phonetic_uk") and phonetic_uk:
                                repaired["phonetic_uk"] = phonetic_uk
                            # US phonetics
                            if not repaired.get("phonetic_us") and phonetic_us:
                                repaired["phonetic_us"] = phonetic_us
                            # Audio URLs
                            if not repaired.get("audio_url_uk") and audio_url:
                                repaired["audio_url_uk"] = audio_url
                            if not repaired.get("audio_url_us") and audio_url:
                                repaired["audio_url_us"] = audio_url
                        
                        # Chỉ yield nếu dictionary có thay đổi so với chunk trước
                        current_json = json.dumps(repaired, ensure_ascii=False)
                        if current_json != last_yielded_json:
                            yield current_json + "\n"
                            last_yielded_json = current_json
                except Exception:
                    pass
    except Exception as e:
        print(f"[AI Stream Translation] Error: {e}")
        yield json.dumps({"error": str(e)}) + "\n"
    finally:
         print(f"[LATENCY] translate_meanings_with_ai_stream for '{word}' TOTAL took {time.time() - start_time:.2f}s")

def lookup_dictionary_full_ai(word: str):
    start_time = time.time()
    """
    Full AI-powered dictionary lookup (fallback when Free API has no results).
    Used for abbreviations, slang, proper nouns, etc.
    Multi-source: Cambridge, Oxford, Merriam-Webster, Longman, Urban Dictionary.
    """
    llm = get_llm()
    if not llm:
        return {"word": word, "error": "LLM not configured"}

    prompt = PromptTemplate.from_template(
        "You are an advanced English dictionary combining data from Cambridge Dictionary, "
        "Oxford Advanced Learner's Dictionary, Longman, Collins, Macmillan, Merriam-Webster, "
        "AND Urban Dictionary (for slang/informal).\n"
        "Look up the English word/term: '{word}'\n\n"
        "IMPORTANT RULES:\n"
        "1. Group meanings logically. Provide 3-6 distinct meanings if the word has multiple senses.\n"
        "2. Cover ALL parts of speech (noun, verb, adj, etc.).\n"
        "3. If the word is an ABBREVIATION (like IT, AI, USA), include its full form as the FIRST meaning.\n"
        "4. If the word has BOTH a common meaning AND an abbreviation meaning, include BOTH.\n"
        "5. Include SLANG and INFORMAL meanings if they exist — mark them with register: 'slang' or 'informal'.\n"
        "6. Provide at least 2-3 natural example sentences for EVERY meaning. NEVER leave empty.\n"
        "7. Provide accurate IPA phonetics for both UK and US.\n\n"
        "Return a JSON object with these EXACT keys:\n"
        '"word": the word (preserve original casing)\n'
        '"phonetic_uk": UK IPA pronunciation\n'
        '"phonetic_us": US IPA pronunciation\n'
        '"pos": primary part of speech\n'
        '"meanings": array of objects, each with:\n'
        '  "pos", "definition_en", "definition_vn", "examples" (2-3),\n'
        '  "synonyms" (3-5), "antonyms" (0-3),\n'
        '  "register": "formal"/"informal"/"slang"/"technical"/"literary"/"neutral",\n'
        '  "usage_notes": brief contextual note\n'
        '"level": CEFR level (A1-C2)\n'
        '"frequency": "very common"/"common"/"uncommon"/"rare"\n'
        '"word_family": array of 5-8 related word forms\n'
        '"collocations": array of 5-8 common collocations\n'
        '"idioms": array of 2-4 idiom objects {{"idiom": "...", "meaning_vn": "..."}}\n'
        '"sources": ["Cambridge", "Oxford", "Longman", "Merriam-Webster", "Collins"]\n\n'
        "Return ONLY valid JSON. No markdown, no extra text."
    )

    chain = prompt | llm
    try:
        try:
            response = _safe_invoke(chain, {"word": word})
        except Exception as e:
            error_str = str(e).lower()
            if any(k in error_str for k in ["quota", "rate_limit", "resource_exhausted", "429", "too many requests"]):
                print(f"[LLM QUOTA] Primary LLM quota exceeded. Retrying with Cohere in lookup_full...")
                fallback_llm = get_llm(provider="cohere")
                if fallback_llm:
                    chain = prompt | fallback_llm
                    response = _safe_invoke(chain, {"word": word})
                else:
                    raise e
            else:
                raise e

        # Ensure we return a default on unparseable JSON without crashing
        result = parse_json_response(response.content)
        if isinstance(result, dict) and "word" in result:
            if is_data_complete(result):
                _cache_set(word, result)
            return result
        return {"word": word, "error": "Could not parse dictionary data"}
    except Exception as e:
        print(f"lookup_dictionary_full_ai error: {e}")
        return {"word": word, "error": str(e)}

def lookup_dictionary_full_ai_stream(word: str):
    """
    Streaming AI dictionary lookup. Yields JSON strings.
    """
    llm = get_llm()
    if not llm:
        yield json.dumps({"word": word, "error": "LLM not configured"})
        return

    prompt = PromptTemplate.from_template(
        "You are an advanced English dictionary combining data from Cambridge Dictionary, "
        "Oxford Advanced Learner's Dictionary, Longman, Collins, Macmillan, Merriam-Webster, "
        "AND Urban Dictionary (for slang/informal).\n"
        "Look up the English word/term: '{word}'\n\n"
        "IMPORTANT RULES:\n"
        "1. Group meanings logically. Provide 3-6 distinct meanings if the word has multiple senses.\n"
        "2. Cover ALL parts of speech (noun, verb, adj, etc.).\n"
        "3. If the word is an ABBREVIATION (like IT, AI, USA), include its full form as the FIRST meaning.\n"
        "4. If the word has BOTH a common meaning AND an abbreviation meaning, include BOTH.\n"
        "5. Include SLANG and INFORMAL meanings if they exist — mark them with register: 'slang' or 'informal'.\n"
        "6. Provide at least 2-3 natural example sentences for EVERY meaning. NEVER leave empty.\n"
        "7. Provide accurate IPA phonetics for both UK and US.\n\n"
        "Return a JSON object with these EXACT keys:\n"
        '"word": the word (preserve original casing)\n'
        '"phonetic_uk": UK IPA pronunciation\n'
        '"phonetic_us": US IPA pronunciation\n'
        '"pos": primary part of speech\n'
        '"meanings": array of objects, each with:\n'
        '  "pos", "definition_en", "definition_vn", "examples" (2-3),\n'
        '  "synonyms" (3-5), "antonyms" (0-3),\n'
        '  "register": "formal"/"informal"/"slang"/"technical"/"literary"/"neutral",\n'
        '  "usage_notes": brief contextual note\n'
        '"level": CEFR level (A1-C2)\n'
        '"frequency": "very common"/"common"/"uncommon"/"rare"\n'
        '"word_family": array of 5-8 related word forms\n'
        '"collocations": array of 5-8 common collocations\n'
        '"idioms": array of 2-4 idiom objects {{"idiom": "...", "meaning_vn": "..."}}\n'
        '"sources": ["Cambridge", "Oxford", "Longman", "Merriam-Webster", "Collins"]\n\n'
        "Return ONLY valid JSON. No markdown, no extra text."
    )

    chain = prompt | llm

    def _safe_stream_invoke(chain_to_use, params, llm_name="Primary"):
        try:
            for chunk in chain_to_use.stream(params):
                yield chunk.content
        except Exception as e:
            error_str = str(e).lower()
            if any(k in error_str for k in ["quota", "rate_limit", "resource_exhausted", "429", "too many requests", "503"]):
                if llm_name == "Primary":
                    print(f"[LLM QUOTA] Primary LLM quota exceeded in stream. Falling back to Cohere...")
                    fallback_llm = get_llm(provider="cohere")
                    if fallback_llm and hasattr(chain_to_use, 'first'):
                        fallback_chain = chain_to_use.first | fallback_llm
                        yield from _safe_stream_invoke(fallback_chain, params, llm_name="Cohere")
                        return
            raise e

    try:
        start_time = time.time()
        accumulated_text = ""
        last_yielded_json = ""
        for content in _safe_stream_invoke(chain, {"word": word}):
            if content:
                accumulated_text += content
                elapsed = time.time() - start_time
                
                # Yield thinking status
                yield json.dumps({
                    "status": "thinking",
                    "chunk": content,
                    "full_thinking": accumulated_text,
                    "elapsed": round(elapsed, 1)
                }, ensure_ascii=False) + "\n"
                
                try:
                    repaired = json_repair.repair_json(accumulated_text, return_objects=True)
                    if isinstance(repaired, dict) and "word" in repaired:
                        repaired["status"] = "result"
                        repaired["_source"] = "ai"  # Mark as AI-generated
                        repaired["_raw_thinking_stream"] = accumulated_text
                        repaired["elapsed"] = round(elapsed, 1)
                        current_json = json.dumps(repaired, ensure_ascii=False)
                        if current_json != last_yielded_json:
                            yield current_json + "\n"
                            last_yielded_json = current_json
                except Exception:
                    pass
    except Exception as e:
        print(f"lookup_dictionary_full_ai_stream error: {e}")
        yield json.dumps({"word": word, "error": str(e)}) + "\n"

def lookup_dictionary(word: str):
    """
    Hybrid dictionary lookup:
    1. Check in-memory cache (only if data is complete)
    2. Try Free Dictionary API first (free, accurate English data)
    3. Use AI for Vietnamese translation + enrichment (slang, register, collocations)
    4. Fallback to full AI if Free API doesn't have the word
    5. Try Wikipedia for additional context
    
    Only caches COMPLETE data (all fields filled).
    """
    # Check cache first — but only return if data is complete
    cached = _cache_get(word)
    if cached and is_data_complete(cached):
        cached["_from_cache"] = True
        # Also try to get Wikipedia data if not cached
        if not cached.get("wikipedia"):
            wikipedia_data = lookup_wikipedia(word)
            if wikipedia_data:
                cached["wikipedia"] = wikipedia_data
        return cached

    # Step 1: Try Free Dictionary API (free, comprehensive English data)
    free_data = lookup_free_dictionary(word)
    
    # Also try Wikipedia in parallel (for additional context)
    wikipedia_data = lookup_wikipedia(word)
    
    if free_data and len(free_data.get("meanings", [])) > 0:
        # Step 2: Use AI for translation + enrichment (slang, register, collocations)
        meanings, level, word_family, collocations, idioms = translate_meanings_with_ai(
            word, free_data["meanings"]
        )
        free_data["meanings"] = meanings
        free_data["level"] = level
        free_data["word_family"] = word_family if word_family else []
        free_data["collocations"] = collocations if collocations else free_data.get("collocations", [])
        # Preserve idioms from Free Dictionary API if AI returns empty
        free_data["idioms"] = idioms if idioms else free_data.get("idioms", [])
        free_data["sources"] = ["Free Dictionary API (Wiktionary)", "Cambridge", "Oxford", "Merriam-Webster"]
        free_data.pop("_needs_translation", None)
        
        # Add Wikipedia data if available
        if wikipedia_data:
            free_data["wikipedia"] = wikipedia_data
        
        # Only cache if data is complete
        if is_data_complete(free_data):
            _cache_set(word, free_data)
        return free_data
    
    # Step 3: Fallback to full AI (for abbreviations, slang, proper nouns)
    result = lookup_dictionary_full_ai(word)
    if not result.get("error") and is_data_complete(result):
        _cache_set(word, result)
    
    # Add Wikipedia data if available
    if wikipedia_data and result:
        result["wikipedia"] = wikipedia_data
    
    return result


def lookup_dictionary_stream(word: str):
    """
    Streaming version of hybrid dictionary lookup.
    Yields JSON chunks.
    1. Check cache -> yields full JSON if complete
    2. Try Free Dictionary API
    3. Use AI stream for translation + enrichment
    4. Fallback to full AI stream
    5. Include Wikipedia data
    """
    import json
    
    # Check cache first
    cached = _cache_get(word)
    if cached and is_data_complete(cached):
        cached["_from_cache"] = True
        cached["status"] = "result"
        # Also try to get Wikipedia data if not cached
        if not cached.get("wikipedia"):
            wikipedia_data = lookup_wikipedia(word)
            if wikipedia_data:
                cached["wikipedia"] = wikipedia_data
        yield json.dumps(cached, ensure_ascii=False)
        return

    # Step 1: Try Free Dictionary API
    free_data = lookup_free_dictionary(word)
    
    # Also try Wikipedia in parallel
    wikipedia_data = lookup_wikipedia(word)
    
    if free_data and len(free_data.get("meanings", [])) > 0:
        # Step 2: Use AI stream for translation + enrichment (pass full free_data to preserve phonetics)
        for chunk in translate_meanings_with_ai_stream(word, free_data["meanings"], free_data):
            # Add Wikipedia data to the chunk if available
            if wikipedia_data and "wikipedia" not in chunk:
                try:
                    import json
                    chunk_data = json.loads(chunk)
                    if "error" not in chunk_data:
                        chunk_data["wikipedia"] = wikipedia_data
                        chunk = json.dumps(chunk_data, ensure_ascii=False)
                except:
                    pass
            yield chunk
        return
    
    # Step 3: Fallback to full AI stream
    for chunk in lookup_dictionary_full_ai_stream(word):
        # Add Wikipedia data if available
        if wikipedia_data and "wikipedia" not in chunk:
            try:
                import json
                chunk_data = json.loads(chunk)
                if "error" not in chunk_data:
                    chunk_data["wikipedia"] = wikipedia_data
                    chunk = json.dumps(chunk_data, ensure_ascii=False)
            except:
                pass
        yield chunk
    return



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
        "You are an English teacher creating exercises from the following text.\n\n"
        "TEXT:\n{text}\n\n"
        "{grammar_context}"
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
            "grammar_context": grammar_context
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
    finally:
        if 'start_time' in locals():
             print(f"[LATENCY] lookup_dictionary_full_ai for '{word}' took {time.time() - start_time:.2f}s")

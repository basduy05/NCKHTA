from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_cohere import ChatCohere
from langchain_core.prompts import PromptTemplate
from typing import List, Dict, Optional, Any
import sys
import io
import os
import json
import asyncio
import sqlite3
import time
import threading
from dotenv import load_dotenv
import re
import json_repair
import cohere
from pydantic import BaseModel, Field

# AI Provider fallback management is now handled in app.database


# --- Pydantic Schemas for Strict AI Outputs ---
class FlashcardSchema(BaseModel):
    word: str = Field(description="The word being defined")
    definition: str = Field(description="Clear English definition")
    example: str = Field(description="Example usage sentence")
    synonym: str = Field(description="A synonymous word")
    antonym: str = Field(description="An antonymous word")

class VocabItemSchema(BaseModel):
    word: str
    pos: str
    meaning_vn: str
    meaning_en: str
    example: str
    level: str
    phonetic: str

class VocabListSchema(BaseModel):
    items: List[VocabItemSchema]

class QuizQuestionSchema(BaseModel):
    type: str = Field(description="Must be MCQ, TFNG, MATCH, or FIB")
    question: str
    options: List[str]
    answer: str
    explanation: str

class QuizListSchema(BaseModel):
    items: List[QuizQuestionSchema]

class FSRSQuestionSchema(BaseModel):
    type: str = Field(description="Must be MCQ, FIB, SPELLING, or PARAPHRASE")
    question: str = Field(description="The main question text (English ONLY)")
    context: Optional[str] = Field(default=None, description="A context sentence with a [blank] for FIB or SPELLING")
    options: Optional[List[str]] = Field(default=None, description="Array of choices (for MCQ/PARAPHRASE)")
    answer: str = Field(description="The correct answer string (must match an option or be the exact spelling word)")
    hint_vn: Optional[str] = Field(default=None, description="A helpful Vietnamese hint or translation")
    explanation_en: Optional[str] = Field(default=None, description="Explanation of why the answer is correct (English ONLY)")
    word_id: Optional[int] = Field(default=None)

class FSRSQuizListSchema(BaseModel):
    items: List[FSRSQuestionSchema]
# ----------------------------------------------
print("[LLM] Core imports done, loading database...")
from ..database import get_db, get_cached_dictionary, set_cached_dictionary, get_setting, mark_provider_failed, is_provider_failed, log_ai_request
from .referee_service import trigger_evaluation, fast_repair_json
from ..utils.resilience import retry
from ..utils.json_utils import clean_json_string

print("[LLM] Loading dotenv...")
load_dotenv()
print("[LLM] Dotenv loaded.")

# ─── IN-MEMORY CACHE for dictionary lookups ──────────────────────────────────
_dict_cache: dict = {}      # word -> {"data": ..., "ts": timestamp}
_cache_lock = threading.Lock()
CACHE_TTL = 3600 * 24       # 24 hours
CACHE_MAX_SIZE = 500

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

# ─── REQUEST QUEUING (SEMAPHORE) ───────────────────────────────────────────

# Limit concurrent AI requests to 15 (Optimized for high RPM Gemma/Flash Lite models)
print("[LLM] Initializing semaphore (v2 - concurrency boost)...")
ai_semaphore = asyncio.Semaphore(15)
print("[LLM] Semaphore initialized with 15 slots.")

def get_queue_status():
    """Returns the current number of active and waiting requests."""
    # Note: This is an approximation for UI updates
    return {
        "active": 7 - ai_semaphore._value,
        "waiting": len(ai_semaphore._waiters) if ai_semaphore._waiters else 0
    }

# ─── CONTEXT WINDOW MANAGEMENT ──────────────────────────────────────────────

def truncate_context(text: str, max_tokens: int = 5000) -> str:
    """Rough token estimation and truncation to fit within context windows."""
    # Simple estimate: 4 chars per token for English
    char_limit = max_tokens * 4
    if len(text) > char_limit:
        print(f"[CONTEXT] Truncating text from {len(text)} to {char_limit} chars.")
        return text[:char_limit] + "... [truncated]"
    return text


def _is_local_fast_mode() -> bool:
    """Prefer lower-latency model routing in local development by default."""
    if os.getenv("RENDER"):
        return False
    return os.getenv("FAST_AI_MODE", "1") == "1"

# ─── COHERE RERANK INTEGRATION ──────────────────────────────────────────────

def rerank_results(query: str, documents: list, top_n: int = 3) -> list:
    """Use Cohere Rerank v3.0 to find the most relevant meanings/results."""
    api_key = get_setting("COHERE_API_KEY")
    if not api_key or len(documents) <= 1:
        return documents[:top_n]
        
    try:
        co = cohere.Client(api_key)
        # Extract text from docs if they are objects
        doc_texts = []
        for doc in documents:
            if isinstance(doc, dict):
                # Combine relevant fields for reranking
                text = f"{doc.get('definition_en', '')} {doc.get('definition_vn', '')} {doc.get('pos', '')}"
                doc_texts.append(text)
            else:
                doc_texts.append(str(doc))
                
        results = co.rerank(
            model="rerank-v3.0",
            query=query,
            documents=doc_texts,
            top_n=top_n
        )
        
        reranked = [documents[res.index] for res in results.results]
        print(f"[RERANK] Successfully reranked {len(documents)} results.")
        return reranked
    except Exception as e:
        print(f"[RERANK] Error: {e}")
        return documents[:top_n]

def parse_json_response(text):
    if not text:
        return {"name": "Error", "description": "AI không phản hồi nội dung. Vui lòng thử lại."}
    
    # 1. Clean up potential markdown wrappers
    clean_text = text.strip()
    if not clean_text:
        return {"name": "Error", "description": "AI phản hồi nội dung rỗng. Vui lòng thử lại."}

    try:
        if "```json" in clean_text:
            match = re.search(r"```json\s*(.*?)\s*```", clean_text, re.DOTALL)
            if match:
                clean_text = match.group(1)
        elif "```" in clean_text:
            match = re.search(r"```\s*(.*?)\s*```", clean_text, re.DOTALL)
            if match:
                clean_text = match.group(1)
        
        # 2. Try standard json
        try:
            parsed = json.loads(clean_text)
            if isinstance(parsed, dict): return parsed
            return {"name": "Response", "description": str(parsed)}
        except Exception:
            # 3. Fallback to json_repair for truncated or messy responses
            try:
                parsed = json_repair.repair_json(clean_text, return_objects=True)
                if isinstance(parsed, dict):
                    if not parsed.get("description") and not parsed.get("content"):
                         return {"name": "Response", "description": str(parsed)}
                    return parsed
                
                # If parsed is a string or list, use it as the description
                return {"name": "Response", "description": str(parsed) if parsed else clean_text}
            except Exception:
                # Absolute fallback: treat the whole thing as plain text
                return {"name": "Response", "description": clean_text}
    except Exception as e:
        print(f"[LLM PARSE] Critical Error: {e}")
        return {"name": "Error", "description": str(e)}


def _parse_json_strict(text: str):
    """Fast strict JSON parse helper used by self-healing paths."""
    try:
        return json.loads(clean_json_string(text or ""))
    except Exception:
        return None


def _is_valid_quiz_payload(payload: Any) -> bool:
    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict) and isinstance(payload.get("items"), list):
        items = payload["items"]
    else:
        return False
    if not items:
        return False
    for item in items:
        if not isinstance(item, dict):
            return False
        if not all(k in item for k in ("question", "options", "answer")):
            return False
        if not isinstance(item.get("options"), list) or len(item.get("options")) < 2:
            return False
    return True


def _is_valid_ipa_payload(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False
    required = ["lesson_title", "sounds", "minimal_pairs", "practice_sentences", "quiz"]
    if any(k not in payload for k in required):
        return False
    if not isinstance(payload.get("sounds"), list) or len(payload.get("sounds")) < 3:
        return False
    if not isinstance(payload.get("quiz"), list) or len(payload.get("quiz")) < 2:
        return False
    return True


def _is_valid_exercises_payload(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False
    has_exercises = isinstance(payload.get("exercises"), list)
    has_quiz = isinstance(payload.get("quiz"), list)
    if not (has_exercises or has_quiz):
        return False
    if not isinstance(payload.get("vocabulary"), list):
        return False
    if "summary_vn" not in payload:
        return False
    return True

def get_llm(difficulty: str = "medium", provider: Optional[str] = None):
    """
    Factory to return the configured LLM instance.
    Routes to different models based on 'difficulty' level.
    Uses only VERIFIED WORKING model names from Google AI Studio.
    - HARD: gemini-2.5-flash (best quality, 5 RPM free)
    - MEDIUM: gemini-2.5-flash-lite (fast, 10 RPM free)
    - EASY: gemini-2.5-flash-lite (fastest, 10 RPM free)
    Fallback: Cohere command-a-03-2025 (675ms, no Gemini key needed)
    """
    if provider is None:
        # Priority 1: Google Gemini (Optimized Routing)
        if not is_provider_failed("Gemini"):
            gemini_key = get_setting("GOOGLE_API_KEY")
            print(f"[LLM DEBUG] Gemini Key exists: {bool(gemini_key and gemini_key.strip())}", flush=True)
            if gemini_key and gemini_key.strip():
                # Use ONLY verified model names from Google AI Studio (User's Quota List)
                if difficulty == "hard":
                    model_names = ["gemini-3.1-pro", "gemini-3-flash", "gemini-2.5-pro", "gemini-1.5-pro"]
                elif difficulty == "easy":
                    model_names = ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemma-3-12b", "gemma-3-27b"]
                else: # medium
                    model_names = ["gemini-3.1-flash-lite", "gemini-3-flash", "gemini-2.5-flash", "gemini-1.5-flash"]
                
                print(f"[LLM DEBUG] Trying Gemini/Gemma models: {model_names}", flush=True)
                for m in model_names:
                    try:
                        print(f"[LLM] Selecting Google ({m}) | Difficulty: {difficulty}", flush=True)
                        return ChatGoogleGenerativeAI(model=m, google_api_key=gemini_key, timeout=20, temperature=0.7)
                    except Exception as e:
                        print(f"[LLM] Gemini {m} Init Failed: {e}", flush=True)
                        continue
                
                # Ultimate fallback for Google
                return ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", google_api_key=gemini_key, timeout=20)
        
        # Priority 2: OpenAI
        if not is_provider_failed("OpenAI"):
            openai_key = get_setting("OPENAI_API_KEY")
            if openai_key and openai_key.strip():
                try:
                    print(f"[LLM] Selecting OpenAI (gpt-4o-mini)", flush=True)
                    return ChatOpenAI(model="gpt-4o-mini", openai_api_key=openai_key, request_timeout=20, temperature=0.7)
                except Exception as e:
                    print(f"[LLM] OpenAI Init Failed: {e}")
                    mark_provider_failed("OpenAI")
        
        # Priority 3: Cohere (Reliable Fallback - VERIFIED WORKING)
        cohere_key = get_setting("COHERE_API_KEY")
        if cohere_key and cohere_key.strip():
            # Prioritize command-a-03-2025 for speed as requested
            cohere_models = ["command-a-03-2025", "command-r-08-2024", "command-r"]
            for cm in cohere_models:
                try:
                    print(f"[LLM] Selecting Cohere ({cm})", flush=True)
                    return ChatCohere(model=cm, cohere_api_key=cohere_key, temperature=0.7)
                except Exception as e:
                    print(f"[LLM] Cohere {cm} Init Failed: {e}", flush=True)
                    continue
            return ChatCohere(model="command-r-08-2024", cohere_api_key=cohere_key)
            
        print("[LLM] NO PROVIDERS CONFIGURED OR AVAILABLE.")
        return None
    
    # Specific provider requested
    if provider == "gemini":
        key = get_setting("GOOGLE_API_KEY")
        return ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", google_api_key=key, timeout=20) if key else None
    if provider == "openai":
        key = get_setting("OPENAI_API_KEY")
        return ChatOpenAI(model="gpt-4o-mini", openai_api_key=key, request_timeout=20) if key else None
    if provider == "cohere":
        key = get_setting("COHERE_API_KEY")
        return ChatCohere(model="command-a-03-2025", cohere_api_key=key) if key else None
    return None

# ─── SAFE LLM INVOKE with retry ──────────────────────────────────────────────
MAX_RETRIES = 1
RETRY_DELAY = 0.5

def _safe_invoke(chain, params: dict, difficulty: str = "medium", retries: int = MAX_RETRIES, feature: str = "Unknown"):
    """
    Wraps chain.invoke with retry logic, failure caching, and latency logging.
    """
    start_time = time.time()
    last_error = None
    model_name = "unknown"
    
    # Attempt to extract model name from chain for logging
    try:
        if hasattr(chain, 'last'): model_name = str(getattr(chain.last, 'model_name', 'unknown'))
        elif hasattr(chain, 'model_name'): model_name = chain.model_name
    except: pass

    for attempt in range(retries + 1):
        try:
            res = chain.invoke(params)
            latency = int((time.time() - start_time) * 1000)
            
            # Log successful request
            try:
                log_ai_request(
                    user_id=None,
                    endpoint="invoke",
                    model=model_name,
                    difficulty=difficulty,
                    latency_ms=latency,
                    status="success",
                    feature=feature,
                    response_content=res.content
                )
                # TRIGGER REFEREE EVALUATION (Background)
                trigger_evaluation(None, "invoke", params, res.content, model_name, feature)
            except Exception as e: print(f"[LLM LOG ERROR] {e}")
            
            return res
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            
            # 429 = Quota, 401/403 = Auth, INVALID_ARGUMENT = expired key
            is_quota_error = any(k in error_str for k in ["quota", "rate_limit", "429", "too many requests", "resource_exhausted"])
            is_auth_error = any(k in error_str for k in ["api_key", "unauthorized", "expired", "401", "403", "forbidden", "invalid_argument", "api key expired"])
            
            if is_auth_error or is_quota_error:
                provider_name = "Gemini" if "google" in error_str or "gemini" in error_str else ("OpenAI" if "openai" in error_str else "Unknown")
                reason = "Quota" if is_quota_error else "Auth"
                print(f"[LLM ERROR] {provider_name} {reason} Failed. Error: {e}. Marking for {FAILURE_WINDOW}s.")
                mark_provider_failed(provider_name)
                
                # Fallback to Cohere immediately
                fallback_llm = get_llm(provider="cohere")
                if fallback_llm:
                    print(f"[LLM] Falling back to Cohere due to {reason} error...")
                    # Reconstruct chain if it's a pipe-style sequence
                    fallback_chain = (chain.first | fallback_llm) if hasattr(chain, 'first') else fallback_llm
                    res = fallback_chain.invoke(params)
                    
                    log_ai_request(None, "invoke_fallback", "command-r-08-2024", difficulty, latency, "fallback", error_str, feature=feature, response_content=res.content)
                    # TRIGGER REFEREE EVALUATION (Background)
                    trigger_evaluation(None, "invoke_fallback", params, res.content, "command-r-08-2024", feature)
                    return res
            else:
                print(f"[LLM ERROR] Unexpected error on attempt {attempt+1}: {e}")
            
            if attempt < retries:
                time.sleep(RETRY_DELAY)
    latency = int((time.time() - start_time) * 1000)
    log_ai_request(None, "invoke_error", model_name, difficulty, latency, "error", str(last_error), feature=feature)
    print(f"[LLM ERROR] All retries failed for safe_invoke. Final error: {last_error}")
    raise last_error

async def _safe_invoke_async(chain, params: dict, difficulty: str = "medium", retries: int = MAX_RETRIES, feature: str = "Unknown"):
    """Async version of _safe_invoke with failure caching and latency logging."""
    start_time = time.time()
    last_error = None
    model_name = "unknown"
    
    # Attempt to extract model name from chain for logging
    try:
        if hasattr(chain, 'last'): model_name = str(getattr(chain.last, 'model_name', 'unknown'))
        elif hasattr(chain, 'model_name'): model_name = chain.model_name
    except: pass

    for attempt in range(retries + 1):
        try:
            if hasattr(chain, 'ainvoke'):
                res = await chain.ainvoke(params)
            else:
                res = await asyncio.to_thread(chain.invoke, params)
            
            latency = int((time.time() - start_time) * 1000)
            
            # Log successful async request
            try:
                log_ai_request(
                    user_id=None,
                    endpoint="ainvoke",
                    model=model_name,
                    difficulty=difficulty,
                    latency_ms=latency,
                    status="success",
                    feature=feature,
                    response_content=res.content
                )
                # TRIGGER REFEREE EVALUATION (Background)
                trigger_evaluation(None, "ainvoke", params, res.content, model_name, feature)
            except Exception as e: print(f"[LLM LOG ERROR] {e}")
            
            return res
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            is_auth_error = any(k in error_str for k in ["api_key", "unauthorized", "expired", "401", "403", "forbidden", "404", "not_found", "not found"])
            is_quota_error = any(k in error_str for k in ["quota", "rate_limit", "429", "too many requests", "resource_exhausted", "limit exceeded"])
            
            if is_auth_error or is_quota_error:
                provider_name = "Gemini" if "google" in error_str or "gemini" in error_str else ("OpenAI" if "openai" in error_str else "Unknown")
                reason = "Quota" if is_quota_error else "Auth"
                print(f"[LLM ERROR] {provider_name} {reason} Failed (Async). Error: {e}. Marking as failed.")
                mark_provider_failed(provider_name)
                
                fallback_llm = get_llm(provider="cohere")
                if fallback_llm:
                    print(f"[LLM] Falling back to Cohere (Async) due to {reason} error...")
                    fallback_chain = (chain.first | fallback_llm) if hasattr(chain, 'first') else fallback_llm
                    res = None
                    if hasattr(fallback_chain, 'ainvoke'):
                        res = await fallback_chain.ainvoke(params)
                    else:
                        res = await asyncio.to_thread(fallback_chain.invoke, params)
                    
                    log_ai_request(None, "ainvoke_fallback", "command-r-08-2024", difficulty, latency, "fallback", error_str, feature=feature, response_content=res.content)
                    
                    # TRIGGER REFEREE EVALUATION (Background)
                    trigger_evaluation(None, "ainvoke_fallback", params, res.content, "command-r-08-2024", feature)
                    
                    # Store warning
                    warning = "> [!CAUTION]\n> **Cảnh báo:** API Key Gemini của bạn đã hết hạn hoặc hết hạn mức. Hệ thống sử dụng AI dự phòng với chất lượng thấp hơn. Vui lòng cập nhật API Key mới.\n\n"
                    if res:
                        setattr(res, '_warning', warning)
                    return res
            else:
                print(f"[LLM ERROR] Unexpected async error on attempt {attempt+1}: {e}")
            
            if attempt < retries:
                await asyncio.sleep(RETRY_DELAY)

    latency = int((time.time() - start_time) * 1000)
    log_ai_request(None, "ainvoke_error", model_name, difficulty, latency, "error", str(last_error), feature=feature)
    print(f"[LLM ERROR] All retries failed for safe_invoke_async. Final error: {last_error}")
    raise last_error

async def _safe_astream(chain, params, difficulty: str = "medium", feature: str = "Unknown"):
    """
    Async generator that wraps chain.astream with fallback logic and latency logging.
    """
    start_time = time.time()
    model_name = "unknown"
    
    try:
        if hasattr(chain, 'last'): model_name = str(getattr(chain.last, 'model_name', 'unknown'))
        elif hasattr(chain, 'model_name'): model_name = chain.model_name
    except: pass

    try:
        async for chunk in chain.astream(params):
            yield chunk
        
        latency = int((time.time() - start_time) * 1000)
        try:
            log_ai_request(None, "astream", model_name, difficulty, latency, "success", feature=feature)
        except Exception as e: print(f"[LLM LOG ERROR] {e}")
            
    except Exception as e:
        error_str = str(e).lower()
        # 404 NOT_FOUND can happen if model name is wrong or unavailable
        is_auth_error = any(k in error_str for k in ["api_key", "unauthorized", "expired", "401", "403", "forbidden", "404", "not_found", "not found", "invalid_argument", "api key expired"])
        is_quota_error = any(k in error_str for k in ["quota", "429", "rate_limit", "resource_exhausted", "limit exceeded"])
        
        if is_auth_error or is_quota_error:
            reason = "Auth/404" if is_auth_error else "Quota"
            provider_name = "Gemini" if "google" in error_str or "gemini" in error_str else "OpenAI"
            mark_provider_failed(provider_name)
            
            fallback_llm = get_llm(provider="cohere")
            if fallback_llm:
                print(f"[LLM] Falling back to Cohere (Stream) due to {reason} error: {e}")
                # Reconstruct chain
                fallback_chain = (chain.first | fallback_llm) if hasattr(chain, 'first') else fallback_llm
                async for chunk in fallback_chain.astream(params):
                    yield chunk
                
                latency = int((time.time() - start_time) * 1000)
                log_ai_request(None, "astream_fallback", "command-r-08-2024", difficulty, latency, "fallback", error_str, feature=feature)
                return
        
        latency = int((time.time() - start_time) * 1000)
        log_ai_request(None, "astream_error", model_name, difficulty, latency, "error", str(e), feature=feature)
        print(f"[LLM STREAM ERROR] {e}")
        raise e



async def generate_flashcard_content(word: str, level: str = "A1"):
    llm = get_llm(difficulty="easy")
    if not llm:
        return {
            "word": word,
            "definition": "Definition not available (Configure API Key)",
            "example": "Example not available"
        }
        
    parser = PydanticOutputParser(pydantic_object=FlashcardSchema)
    
    prompt = PromptTemplate(
        template=(
            "Generate a flashcard for the English word '{word}' suitable for level '{level}'.\n\n"
            "{format_instructions}\n"
        ),
        input_variables=["word", "level"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {"word": word, "level": level}, difficulty="easy", feature="Flashcard")
            result = parser.invoke(response)
            return result.model_dump()
    except Exception as e:
        print(f"generate_flashcard_content error: {e}")
        if 'response' in locals() and hasattr(response, 'content'):
            res = parse_json_response(response.content)
            if isinstance(res, dict) and "definition" in res:
                return res
        return {
            "word": word,
            "definition": f"Error generating content: {str(e)}",
            "example": ""
        }

from langchain_core.output_parsers import PydanticOutputParser

async def extract_vocabulary_from_text(text: str):
    """
    Uses LLM to analyse text and extract key vocabulary words with metadata.
    Essential for the 'Input Text -> Learn' feature.
    Guaranteed JSON schema output via PydanticOutputParser.
    """
    llm = get_llm(difficulty="easy")
    if not llm:
        return [{"word": "Error", "meaning": "LLM not configured"}]
        
    num = 10
    parser = PydanticOutputParser(pydantic_object=VocabListSchema)
    
    prompt = PromptTemplate(
        template=(
            "You are an expert English linguist and teacher.\n"
            "Analyze the following text and extract exactly {num} important vocabulary words/terms for a student to learn.\n\n"
            "TEXT:\n{text}\n\n"
            "SELECTION CRITERIA:\n"
            "1. Prioritize academic, professional, or complex words that appear in the text.\n"
            "2. Do NOT include basic words (like 'the', 'is', 'happy') unless used in a technical sense.\n"
            "3. Ensure the word/phrase is SPELLED EXACTLY as it appears in the text.\n\n"
            "{format_instructions}\n"
        ),
        input_variables=["num", "text"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )

    chain = prompt | llm
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {"text": text, "num": num}, difficulty="easy", feature="Vocab Extraction")
            # Parse text into Pydantic model
            result = parser.invoke(response)
            # Convert List[VocabItemSchema] -> List[dict]
            return [item.model_dump() for item in result.items]
    except Exception as e:
        print(f"extract_vocabulary error: {e}")
        # Fallback to old parsing if OutputParser fails due to hallucination
        if 'response' in locals() and hasattr(response, 'content'):
            res = parse_json_response(response.content)
            if isinstance(res, list) and len(res) > 0:
                try: 
                    # Try to map fields correctly if nested in 'items'
                    if isinstance(res, dict) and "items" in res:
                        return res["items"]
                    return res
                except: pass
        return [{"word": "Error", "meaning_vn": str(e), "pos": "", "meaning_en": "", "example": "", "level": "", "phonetic": ""}]

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
    llm = get_llm(difficulty="medium")
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

def generate_example_sentence(word: str, meaning: str = "", level: str = "B1"):
    llm = get_llm(difficulty="easy")
    if not llm:
        return f"Example for {word} (Auto-generated placeholder)"

    prompt = PromptTemplate.from_template(
        "Generate a short, clear English example sentence for the word '{word}' (meaning: '{meaning}') at CEFR level {level}. Return ONLY the sentence text, no quotes."
    )

    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {"word": word, "meaning": meaning, "level": level}, feature="Example Sentence")
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
    llm = get_llm(difficulty="easy")
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
        "meanings that are MISSING from the raw data (especially slang, informal, or specialized meanings).\n"
        "**CRITICAL:** Sort the meanings by relevance and frequency. The MOST COMMON and SAT NGHĨA (most accurate/direct) meanings MUST be listed FIRST.\n\n"
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
        "CRITICAL: Every English field must have a high-quality Vietnamese translation in 'definition_vn' and 'meaning_vn'. These fields MUST be a plain string, NO nested objects.\n"
        "Return ONLY valid JSON. No markdown."
    )
    
    chain = prompt | llm

    @retry(tries=2, delay=2.0)
    def _invoke_with_retry():
        try:
            return _safe_invoke(chain, {"word": word, "definitions": definitions_text}, difficulty="easy", feature="Dictionary Translation")
        except Exception as e:
            raise e

    try:
        response = _invoke_with_retry()
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

async def translate_meanings_with_ai_stream(word: str, meanings: list, free_data: dict = None, estimate_level: bool = True):
    """
    Streaming version of translate_meanings_with_ai. Yields JSON chunks as they arrive.
    Takes optional free_data to preserve phonetics and other metadata from Free Dictionary API.
    """
    start_time = time.time()
    llm = get_llm(difficulty="easy")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return
    
    # Pre-populate phonetics and audio from free_data to enable fast first byte
    phonetic_uk = ""
    phonetic_us = ""
    audio_url = ""
    if free_data:
        phonetic_uk = free_data.get("phonetic_uk", "")
        phonetic_us = free_data.get("phonetic_us", "")
        audio_url = free_data.get("audio_url", "")
    
    # Fast first byte: yield initial structure if we have some data
    if free_data:
        yield json.dumps({
            "status": "thinking",
            "word": word,
            "phonetic_uk": phonetic_uk,
            "phonetic_us": phonetic_us,
            "audio_url": audio_url,
            "elapsed": 0.1
        }, ensure_ascii=False) + "\n"

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
        "3. 'definition_vn' — accurate and natural Vietnamese translation (MANDATORY)\n"
        "4. 'examples' — 2-3 realistic example sentences. EACH sentence must be followed by its Vietnamese translation. Format: ['English sentence | Dịch tiếng Việt', ...]. MUST have at least 2.\n"
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
    
    async def _safe_stream_invoke(chain_to_use, params, llm_name="Primary"):
        try:
            if hasattr(chain_to_use, 'astream'):
                async for chunk in chain_to_use.astream(params):
                    yield chunk.content
            else:
                for chunk in chain_to_use.stream(params):
                    yield chunk.content
        except Exception as e:
            error_str = str(e).lower()
            is_quota = any(k in error_str for k in ["quota", "rate_limit", "resource_exhausted", "429", "too many requests", "503", "403", "404", "forbidden", "not found"])
            is_auth = any(k in error_str for k in ["api_key", "unauthorized", "invalid", "api key", "expired"])
            
            if is_quota or is_auth:
                if llm_name == "Primary":
                    reason = "quota exceeded" if is_quota else "API key invalid/expired"
                    print(f"[LLM ERROR] Primary LLM {reason} in stream. Falling back to Cohere...")
                    fallback_llm = get_llm(provider="cohere")
                    if fallback_llm and hasattr(chain_to_use, 'first'):
                        fallback_chain = chain_to_use.first | fallback_llm
                        async for c in _safe_stream_invoke(fallback_chain, params, llm_name="Cohere"):
                            yield c
                        return
            raise e

    try:
        accumulated_text = ""
        last_yielded_json = ""
        chunk_count = 0
        
        async with ai_semaphore:
            async for content in _safe_stream_invoke(chain, {"word": word, "definitions": definitions_text}):
                if content:
                    # Vietnamese font fix: DO NOT use encode('utf-8').decode('unicode_escape')
                    # It corrupts raw UTF-8 characters. 
                    # LLMs today output raw UTF-8 by default.
                    
                    accumulated_text += content
                    elapsed = time.time() - start_time
                    chunk_count += 1
                    
                    # Yield raw thinking chunk
                    yield json.dumps({
                        "status": "thinking", 
                        "chunk": content, 
                        "full_thinking": accumulated_text,
                        "elapsed": round(elapsed, 1),
                        "queue": get_queue_status()
                    }, ensure_ascii=False) + "\n"
                
                # Cố gắng repair json từ text accumulate, nhưng chỉ làm mỗi 10 chunks để tiết kiệm CPU
                if chunk_count % 10 == 0 or len(content) > 100:
                    try:
                        repaired = json_repair.repair_json(accumulated_text, return_objects=True)
                        if isinstance(repaired, dict) and isinstance(repaired.get("meanings"), list):
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
    llm = get_llm(difficulty="easy")
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
            response = _safe_invoke(chain, {"word": word}, difficulty="easy", feature="Full Dictionary Lookup")
        except Exception as e:
            error_str = str(e).lower()
            is_quota = any(k in error_str for k in ["quota", "rate_limit", "resource_exhausted", "429", "too many requests", "403", "404", "forbidden", "not found"])
            is_auth = any(k in error_str for k in ["api_key", "unauthorized", "invalid", "api key", "expired"])
            
            if is_quota or is_auth:
                reason = "quota exceeded" if is_quota else "API key invalid/expired"
                print(f"[LLM ERROR] Primary LLM {reason}: {e}. Retrying with Cohere in lookup_full...")
                fallback_llm = get_llm(provider="cohere")
                if fallback_llm:
                    chain = prompt | fallback_llm
                    response = _safe_invoke(chain, {"word": word}, feature="Full Dictionary Lookup")
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

async def lookup_dictionary_full_ai_stream(word: str):
    """
    Streaming AI dictionary lookup. Yields JSON strings.
    """
    llm = get_llm(difficulty="easy")
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

    async def _safe_stream_invoke(chain_to_use, params, llm_name="Primary"):
        try:
            if hasattr(chain_to_use, 'astream'):
                async for chunk in chain_to_use.astream(params):
                    yield chunk.content
            else:
                for chunk in chain_to_use.stream(params):
                    yield chunk.content
        except Exception as e:
            error_str = str(e).lower()
            is_quota = any(k in error_str for k in ["quota", "rate_limit", "resource_exhausted", "429", "too many requests", "503", "403", "404", "forbidden", "not found"])
            is_auth = any(k in error_str for k in ["api_key", "unauthorized", "invalid", "api key", "expired"])
            
            if is_quota or is_auth:
                if llm_name == "Primary":
                    reason = "quota exceeded" if is_quota else "API key invalid/expired"
                    print(f"[LLM ERROR] Primary LLM {reason} in stream. Falling back to Cohere...")
                    fallback_llm = get_llm(provider="cohere")
                    if fallback_llm and hasattr(chain_to_use, 'first'):
                        fallback_chain = chain_to_use.first | fallback_llm
                        async for c in _safe_stream_invoke(fallback_chain, params, llm_name="Cohere"):
                            yield c
                        return
            raise e

    try:
        start_time = time.time()
        accumulated_text = ""
        last_yielded_json = ""
        chunk_count = 0
        async with ai_semaphore:
            async for content in _safe_stream_invoke(chain, {"word": word}):
                if content:
                    # Vietnamese font fix: DO NOT use encode('utf-8').decode('unicode_escape')
                    
                    accumulated_text += content
                    elapsed = time.time() - start_time
                    chunk_count += 1
                    
                    # Yield thinking status
                    yield json.dumps({
                        "status": "thinking",
                        "chunk": content,
                        "full_thinking": accumulated_text,
                        "elapsed": round(elapsed, 1),
                        "queue": get_queue_status()
                    }, ensure_ascii=False) + "\n"
                
                # Chỉ repair json mỗi 10 chunks
                if chunk_count % 10 == 0:
                    try:
                        repaired = json_repair.repair_json(accumulated_text, return_objects=True)
                        if isinstance(repaired, dict) and "word" in repaired and isinstance(repaired.get("meanings"), list):
                            repaired["status"] = "result"
                            repaired["_source"] = "ai"
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


async def lookup_dictionary_stream(word: str, free_data: dict = None, wikipedia_data: dict = None):
    """
    Streaming version of hybrid dictionary lookup.
    Yields JSON chunks.
    1. Check cache -> yields full JSON if complete
    2. Use provided free_data/wikipedia_data OR fetch if missing
    3. Use AI stream for translation + enrichment
    """
    import json
    from . import graph_service
    
    # Pre-fetch graph connections early (even for cache misses)
    # This fixes the "second lookup" bug
    connections = graph_service.get_word_connections(word.lower())
    graph_connections = connections.get("connections", [])
    
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

    # Step 1: Resolve Dependencies (Use provided or fetch)
    if not free_data:
        free_data = lookup_free_dictionary(word)
    
    if not wikipedia_data:
        # Also try Wikipedia in parallel
        wikipedia_data = lookup_wikipedia(word)
    
    if free_data and len(free_data.get("meanings", [])) > 0:
        # Step 2: Use AI stream for translation + enrichment (pass full free_data to preserve phonetics)
        async for chunk in translate_meanings_with_ai_stream(word, free_data["meanings"], free_data):
            # Add Wikipedia and Graph data to the chunk if available
            if (wikipedia_data or graph_connections) and "wikipedia" not in chunk:
                try:
                    import json
                    chunk_data = json.loads(chunk)
                    if "error" not in chunk_data:
                        if wikipedia_data: chunk_data["wikipedia"] = wikipedia_data
                        if graph_connections: chunk_data["graph_connections"] = graph_connections
                        chunk = json.dumps(chunk_data, ensure_ascii=False)
                except:
                    pass
            yield chunk
        return
    
    # Step 3: Fallback to full AI stream
    async for chunk in lookup_dictionary_full_ai_stream(word):
        # Add Wikipedia and Graph data if available
        if (wikipedia_data or graph_connections) and "wikipedia" not in chunk:
            try:
                import json
                chunk_data = json.loads(chunk)
                if "error" not in chunk_data:
                    if wikipedia_data: chunk_data["wikipedia"] = wikipedia_data
                    if graph_connections: chunk_data["graph_connections"] = graph_connections
                    chunk = json.dumps(chunk_data, ensure_ascii=False)
            except:
                pass
        yield chunk
    return



# ═══════════════════════════════════════════════════════════════════════════════
# NEW FEATURES: IPA, File Exercises, TOEIC/IELTS, Reading, Writing, Speaking
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_ipa_lesson(words: list = None, focus: str = "vowels"):
    """Generate an IPA learning lesson with interactive exercises."""
    difficulty = "easy" if _is_local_fast_mode() else "medium"
    llm = get_llm(difficulty=difficulty)
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
        '  "sentence": the sentence text with the target word replaced by [blank] (e.g. "I [blank] the bird." if target is "saw")\n'
        '  "answer": the correct word for the [blank]\n'
        '  "ipa": full IPA transcription\n'
        '  "focus_words": array of words containing target sounds\n'
        '"quiz": array of 5 MCQ questions testing IPA knowledge, each with:\n"question": question text\n'
        '  "options": 4 options\n'
        '  "correct_answer": the correct option\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    words_context = f"Include these words in examples if possible: {words_text}" if words_text else ""
    chain = prompt | llm
    repair_context = f"IPA lesson focus={focus}; words={words_text[:180]}"
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {"focus": focus, "words_context": words_context}, difficulty=difficulty, feature="IPA Lesson")
            parsed = _parse_json_strict(getattr(response, "content", ""))
            if _is_valid_ipa_payload(parsed):
                return parsed

            repaired = await fast_repair_json(repair_context, getattr(response, "content", ""), feature="IPA Lesson")
            if repaired:
                repaired_obj = _parse_json_strict(repaired)
                if _is_valid_ipa_payload(repaired_obj):
                    return repaired_obj

            # Keep backward-compatible fallback behavior.
            result = parse_json_response(getattr(response, "content", ""))
            if _is_valid_ipa_payload(result):
                return result
            return {"error": "Could not parse IPA lesson"}
    except Exception as e:
        print(f"generate_ipa_lesson error: {e}")
        return {"error": str(e)}


async def generate_ipa_lesson_stream(text: str):
    """Streaming version of generate_ipa_lesson."""
    llm = get_llm(difficulty="medium")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return

    prompt = PromptTemplate.from_template(
        "You are an English phonetics (IPA) expert.\n"
        "Generate an IPA lesson based on this text:\n{text}\n\n"
        "Return a JSON object with:\n"
        '"title": lesson title\n'
        '"vocabulary": array of objects with "word", "ipa", "meaning_vn", "audio_link"\n'
        '"practice_sentences": array of sentences with their IPA\n'
        '"tips": 3 pronunciation tips in Vietnamese\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {"text": text}, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
    
    try:
        result = parse_json_response(full_content)
        result["status"] = "success"
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)


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
    from . import graph_service
    relevant_rules = graph_service.get_relevant_grammar_rules(text_truncated)
    
    grammar_context = ""
    if relevant_rules:
        grammar_context = "\n\nRelevant Grammar Rules from Knowledge Graph:\n"
        for r in relevant_rules:
            grammar_context += f"- {r['name']}: {r['description']}\n"
    else:
        # Fallback to general SQL lookup if graph fails/empty
        try:
            from ..database import get_db
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
    llm = get_llm(difficulty="medium")
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
            }, difficulty="medium", feature="Practice Test")
            result = parse_json_response(response.content)
            if isinstance(result, dict):
                return result
            return {"error": "Could not generate practice test"}
    except Exception as e:
        print(f"generate_practice_test error: {e}")
        return {"error": str(e)}


async def generate_practice_test_stream(test_type: str = "TOEIC", skill: str = "reading", part: str = ""):
    """Streaming version of generate_practice_test."""
    llm = get_llm(difficulty="medium")
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


async def generate_reading_passage(topic: str = "", level: str = "B1"):
    """Generate a reading passage with comprehension questions."""
    llm = get_llm(difficulty="medium")
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
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {
                "level": level,
                "topic": topic or "an interesting general topic",
            }, difficulty="medium", feature="Reading Passage")
            result = parse_json_response(response.content)
            if isinstance(result, dict):
                return result
            return {"error": "Could not generate reading passage"}
    except Exception as e:
        print(f"generate_reading_passage error: {e}")
        return {"error": str(e)}


async def generate_reading_passage_stream(topic: str = "", level: str = "B1"):
    """Streaming version of generate_reading_passage."""
    llm = get_llm(difficulty="medium")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return

    prompt = PromptTemplate.from_template(
        "Generate an English reading comprehension exercise at CEFR level {level}.\n"
        "Topic: {topic}\n\n"
        "Return JSON with title, passage, word_count, key_vocabulary, questions, summary_vn.\n"
        "Return ONLY valid JSON."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "level": level,
        "topic": topic or "an interesting general topic",
    }, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        result["status"] = "success"
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)


async def evaluate_writing(text: str, task_type: str = "essay", target_test: str = "IELTS"):
    """Evaluate writing using IELTS/TOEIC criteria. Returns band score + detailed feedback."""
    llm = get_llm(difficulty="hard")
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
        "CRITICAL: 'explanation_vn', 'feedback_vn', and 'description_vn' MUST be plain strings, NOT objects.\n"
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {
                "text": text[:2000],
                "task_type": task_type,
                "target_test": target_test,
            }, difficulty="hard", feature="Writing Evaluation")
            result = parse_json_response(response.content)
            if isinstance(result, dict):
                return result
            return {"error": "Could not evaluate writing"}
    except Exception as e:
        print(f"evaluate_writing error: {e}")
        return {"error": str(e)}


async def evaluate_writing_stream(text: str, task_type: str = "essay", target_test: str = "IELTS"):
    """Streaming version of evaluate_writing."""
    llm = get_llm(difficulty="hard")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return

    prompt = PromptTemplate.from_template(
        "You are an expert {target_test} writing examiner.\n"
        "Evaluate the following {task_type} writing:\n\n"
        "STUDENT'S WRITING:\n{text}\n\n"
        "Requirements:\n"
        "1. Provide a band score or percentage based on official {target_test} standards.\n"
        "2. Break down the evaluation into detailed criteria (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).\n"
        "3. Provide feedback for EACH criterion in Vietnamese.\n"
        "4. Include specific corrected sentences with explanations in Vietnamese.\n"
        "5. Provide a high-quality model paragraph for comparison.\n\n"
        "Return a JSON object with this structure:\n"
        '- "overall_band": number\n'
        '- "word_count": number\n'
        '- "criteria": {{"task_achievement": {{"score": n, "feedback_vn": "..."}}, "coherence_cohesion": {{"score": n, "feedback_vn": "..."}}, "lexical_resource": {{"score": n, "feedback_vn": "..."}}, "grammar_accuracy": {{"score": n, "feedback_vn": "..."}}}}\n'
        '- "strengths": ["...", "..." in Vietnamese]\n'
        '- "improvements": ["...", "..." in Vietnamese]\n'
        '- "corrected_sentences": [{{"original": "...", "corrected": "...", "explanation_vn": "..."}}]\n'
        '- "model_paragraph": "text content"\n\n'
        "Return ONLY the raw JSON object. No markdown."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "target_test": target_test,
        "task_type": task_type,
        "text": text,
    }, difficulty="hard"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        result["status"] = "success"
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)


async def generate_speaking_topic(level: str = "B1", topic_type: str = "general"):
    """Generate speaking practice topics with model answers."""
    llm = get_llm(difficulty="medium")
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
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {"level": level, "topic_type": topic_type}, difficulty="medium", feature="Speaking Topic")
            result = parse_json_response(response.content)
            if isinstance(result, dict):
                return result
            return {"error": "Could not generate speaking topic"}
    except Exception as e:
        print(f"generate_speaking_topic error: {e}")
        return {"error": str(e)}


async def generate_speaking_topic_stream(level: str = "B1", topic_type: str = "general"):
    """Streaming version of generate_speaking_topic."""
    llm = get_llm(difficulty="medium")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return

    prompt = PromptTemplate.from_template(
        "You are an English speaking coach.\n"
        "Generate a speaking practice session at level {level} (Type: {topic_type}).\n\n"
        "Return JSON with title, prompt, sub_questions (array), model_answer, and key_phrases (word, meaning_vn).\n"
        "Return ONLY valid JSON."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "level": level,
        "topic_type": topic_type,
    }, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        result["status"] = "success"
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)
    finally:
        pass

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

async def generate_vocab_practice_rich(words: List[dict]):
    """Generate professional vocabulary exercises with hints and diverse types."""
    llm = get_llm(difficulty="medium")
    if not llm:
        return []
    
    words_info = "\n".join([f"- [ID: {w.get('id', i)}] {w['word']} ({w.get('meaning_en', '')})" for i, w in enumerate(words)])
    
    prompt = PromptTemplate(
        input_variables=["words"],
        template=(
            "You are a premium English language assessment designer.\n"
            "Create a challenging and meaningful vocabulary practice set for these words:\n{words}\n\n"
            "QUESTION TYPES TO INCLUDE (Mix them up):\n"
            "1. MCQ: Traditional multiple choice for definition or synonym.\n"
            "2. FIB: Fill in the blanks. Provide a `question` sentence with a '[blank]'. The `answer` must be the word being tested.\n"
            "3. SPELLING: Give a meaning or context, and ask the user to type the word exactly. No options needed.\n"
            "4. PARAPHRASE: Provide a sentence, ask the user to choose the option that has the closest meaning.\n"
            "5. MATCHING: Provide a list of terms and a list of definitions to be matched.\n\n"
            "REQUIREMENTS:\n"
            "- CRITICAL: Ensure ALL questions, options, and answers are **100% strictly in English**. DO NOT include any Vietnamese in them.\n"
            "- CRITICAL: For MCQ, FIB, and PARAPHRASE, the `answer` string MUST EXACTLY MATCH one of the strings in the `options` array.\n"
            "- For MATCHING, the `options` should be an array of definitions, and `answer` should be a corresponding array of words in the same order, OR a special `matching_pairs` field: [{{\"word\": \"...\", \"def\": \"...\"}}].\n"
            "- The only fields allowed to hold Vietnamese are `hint_vn` (required for all) and `explanation_vn` (brief Vietnamese explanation).\n"
            "- Each question MUST include the 'word_id' field matching the [ID: ...] provided in the list.\n"
            "- 'type': One of ['MCQ', 'FIB', 'SPELLING', 'PARAPHRASE', 'MATCHING'].\n\n"
            "Return a JSON object with an 'exercises' key containing an array of 10-15 objects with these keys: {{word_id, type, question, hint_vn, options, answer, matching_pairs, explanation_vn}}.\n"
            "Return ONLY the JSON. No markdown."
        )
    )
    chain = prompt | llm
    try:
        async with ai_semaphore:
            # Optimize: explicitly ask for a concise but high-quality response to reduce latency
            response = await _safe_invoke_async(chain, {"words": words_info, "num": 10}, difficulty="medium", feature="Vocab Practice")
            result = parse_json_response(response.content)
            
            # Ensure it's always an array wrapper if it's just a raw list
            if isinstance(result, list):
                return {"exercises": result}
            return result
    except Exception as e:
        print(f"[LLM VOCAB PRACTICE] ERROR: {e}", flush=True)
        return []

async def generate_vocab_practice_rich_stream(words: List[dict]):
    """Streaming version of generate_vocab_practice_rich."""
    llm = get_llm(difficulty="medium")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return
    
    words_info = "\n".join([f"- [ID: {w['id']}] {w['word']} ({w['meaning_en']})" for w in words])
    
    prompt = PromptTemplate.from_template(
        "You are a premium English language assessment designer.\n"
        "Create a challenging and meaningful vocabulary practice set for these words:\n{words}\n\n"
        "INSTRUCTIONS:\n"
        "1. Create a MIX of these types: Multiple Choice (meaning), Synonym Match, Contextual Fill-in (sentence), and Scrambled Sentences.\n"
        "2. Ensure questions are NATURAL and reflect real-world usage.\n"
        "3. Provide explanation in Vietnamese for each.\n"
        "4. CRITICAL: Each question MUST include the 'word_id' field matching the ID provided in the list above.\n\n"
        "Return a JSON array of 10-15 questions. Each object must have: {{word_id, question, hint_vn, options, answer, explanation_vn}}."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {"words": words_info}, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)


async def generate_grammar_practice(rules: List[str], difficulty: str = "Medium"):
    """Generate tailored grammar practice based on specific rules."""
    llm = get_llm(difficulty="medium")
    if not llm: return []
    
    prompt = PromptTemplate.from_template(
        "Create a {difficulty} level grammar practice for these rules: {rules}.\n"
        "Include variety: Structure completion, Error correction, and Transformation.\n"
        "Return a JSON array of 10 objects {{question, options, answer, explanation_vn}}."
    )
    print(f"[LLM GRAMMAR PRACTICE] Generating for {len(rules)} rules (Difficulty: {difficulty})...", flush=True)
    chain = prompt | llm
    try:
        response = await _safe_invoke_async(chain, {"difficulty": difficulty, "rules": ", ".join(rules)}, difficulty="medium", feature="Grammar Practice")
        result = parse_json_response(response.content)
        print(f"[LLM GRAMMAR PRACTICE] Success: generated {len(result) if isinstance(result, list) else 0} questions", flush=True)
        return result
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
        "You are an expert English teacher.\n"
        "Create a {difficulty} level grammar practice for these rules: {rules}.\n"
        "Include variety: Structure completion, Error correction, and Transformation.\n"
        "Provide detailed explanations in Vietnamese.\n\n"
        "Return a JSON array of 10-15 objects {{question, options, answer, explanation_vn}}."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {"difficulty": difficulty_val, "rules": ", ".join(rules)}, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)

async def generate_personalized_roadmap_stream(user_info: dict, words: List[dict]):
    """Streaming version of generate_personalized_roadmap."""
    llm = get_llm(difficulty="hard")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return
    
    goal = user_info.get("target_goal", "General English")
    level = user_info.get("current_level", "B1")
    words_summary = ", ".join([w['word'] for w in words[:20]])
    
    prompt = PromptTemplate.from_template(
        "You are an expert AI Education Advisor.\n"
        "Create a personalized English learning roadmap for a student with these details:\n"
        "- Current Level: {level}\n"
        "- Target Goal: {goal}\n"
        "- Recently Learned Words: {words}\n\n"
        "Return a JSON object with title, summary_vn, phases (name, duration, tasks_vn, focus_topics), and tips_vn.\n"
        "Return ONLY the raw JSON object."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "level": level,
        "goal": goal,
        "words": words_summary,
    }, difficulty="hard"):
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

async def generate_reading_comprehension(article_title: str, article_content: str, difficulty: str = "Medium", num_questions: int = 5):
    """Generate a reading comprehension test from a news article."""
    llm = get_llm(difficulty="medium")
    if not llm: return {"error": "LLM not configured"}
    
    prompt = PromptTemplate.from_template(
        "You are an expert English teacher. Create a reading comprehension test for the following article.\n\n"
        "Title: {title}\n"
        "Content: {content}\n\n"
        "Difficulty Level: {difficulty}\n"
        "Number of Questions: {num_questions}\n\n"
        "Please generate {num_questions} questions. Include a mix of Multiple Choice, True/False/Not Given, and Vocabulary in Context questions. "
        "Return the output as a JSON object with the following structure:\n"
        "{{\n"
        "  \"passage\": \"The provided article content or a slightly adapted version for the difficulty level\",\n"
        "  \"questions\": [\n"
        "    {{\n"
        "      \"type\": \"multiple_choice|tfng|vocab\",\n"
        "      \"question\": \"Question text\",\n"
        "      \"options\": [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"], (only if multiple choice or vocab)\n"
        "      \"correct_answer\": \"The exact correct option or True/False/Not Given\",\n"
        "      \"explanation\": \"Why this is correct\"\n"
        "    }}\n"
        "  ]\n"
        "}}\n"
        "Ensure the JSON is perfectly formatted."
    )
    chain = prompt | llm
    print(f"[LLM READING COMPREHENSION] Generating for article: {article_title}...", flush=True)
    try:
        response = await _safe_invoke_async(chain, {
            "title": article_title, 
            "content": article_content, 
            "difficulty": difficulty_param,
            "num_questions": num_questions
        }, difficulty="medium", feature="Reading Comprehension")
        result = parse_json_response(response.content)
        print(f"[LLM READING COMPREHENSION] Success", flush=True)
        return result
    except Exception as e:
        print(f"[LLM READING COMPREHENSION] Error: {e}", flush=True)
        return {"error": str(e)}

async def generate_reading_comprehension_stream(article_title: str, article_content: str, difficulty: str = "Medium", num_questions: int = 5):
    """Streaming version of generate_reading_comprehension."""
    llm = get_llm(difficulty="medium")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return
        
    prompt = PromptTemplate.from_template(
        "You are an expert English teacher. Create a reading comprehension test for the following article.\n\n"
        "Title: {title}\n"
        "Content: {content}\n\n"
        "Difficulty Level: {difficulty}\n"
        "Number of Questions: {num_questions}\n\n"
        "Please generate {num_questions} questions. Include a mix of Multiple Choice, True/False/Not Given, and Vocabulary in Context.\n"
        "Return a JSON object with passage and questions (type, question, options, correct_answer, explanation).\n"
        "Return ONLY the raw JSON object."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "title": article_title, 
        "content": article_content, 
        "difficulty": difficulty_param, 
        "num_questions": num_questions
    }, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)

async def grade_writing_assignment(prompt_text: str, student_answer: str, test_type: str = "IELTS"):
    """Grade a writing assignment (IELTS or TOEIC) and return detailed feedback."""
    llm = get_llm(difficulty="hard")
    if not llm: return {"id": "error", "error": "LLM not configured"}
    
    prompt = PromptTemplate.from_template(
        "You are an expert {test_type} Writing examiner. Evaluate the following student essay.\n\n"
        "Prompt/Question: {prompt_text}\n\n"
        "Student Answer:\n{student_answer}\n\n"
        "Provide a detailed evaluation in perfectly formatted JSON. Use the following structure:\n"
        "{{\n"
        "  \"score\": 7.0, (Overall band score for IELTS, or a numerical score for TOEIC)\n"
        "  \"feedback_summary\": \"A short paragraph summarizing the overall performance.\",\n"
        "  \"criteria_scores\": {{\n"
        "    \"Task Achievement / Response\": 7.0,\n"
        "    \"Coherence and Cohesion\": 7.0,\n"
        "    \"Lexical Resource\": 6.5,\n"
        "    \"Grammatical Range and Accuracy\": 7.5\n"
        "  }},\n"
        "  \"detailed_feedback\": [\n"
        "    {{\"category\": \"Strengths\", \"points\": [\"...\", \"...\"]}},\n"
        "    {{\"category\": \"Weaknesses\", \"points\": [\"...\", \"...\"]}},\n"
        "    {{\"category\": \"Suggestions for Improvement\", \"points\": [\"...\", \"...\"]}}\n"
        "  ],\n"
        "  \"corrected_version\": \"A grammatically corrected and slightly improved version of the student's essay (keep their original voice as much as possible, just fix errors and smooth out phrasing).\"\n"
        "}}\n"
    )
    chain = prompt | llm
    print(f"[LLM WRITING GRADING] Grading {test_type} essay...", flush=True)
    try:
        response = await _safe_invoke_async(chain, {"test_type": test_type, "prompt_text": prompt_text, "student_answer": student_answer}, difficulty="hard", feature="Writing Grading")
        result = parse_json_response(response.content)
        print(f"[LLM WRITING GRADING] Success", flush=True)
        return result
    except Exception as e:
        print(f"[LLM WRITING GRADING] Error: {e}", flush=True)
        return {"error": str(e)}

async def generate_personalized_roadmap(user_info: dict, words: List[dict]):
    """Generate a custom learning roadmap based on user's vocabulary and goals."""
    llm = get_llm(difficulty="hard")
    if not llm: return {"error": "LLM not configured"}
    
    goal = user_info.get("target_goal", "General English")
    level = user_info.get("current_level", "B1")
    words_summary = ", ".join([w['word'] for w in words[:20]])
    
    prompt = PromptTemplate.from_template(
        "You are an expert AI Education Advisor.\n"
        "Create a personalized English learning roadmap for a student with these details:\n"
        "- Current Level: {level}\n"
        "- Target Goal: {goal}\n"
        "- Recently Learned Words: {words}\n\n"
        "Return a JSON object with this structure:\n"
        "{{\n"
        "  \"title\": \"Catchy title for the roadmap\",\n"
        "  \"summary_vn\": \"Brief overview in Vietnamese (2-3 sentences)\",\n"
        "  \"phases\": [\n"
        "    {{\n"
        "      \"name\": \"Phase name (e.g. Vocabulary Expansion)\",\n"
        "      \"duration\": \"Estimated time (e.g. 2 weeks)\",\n"
        "      \"tasks_vn\": [\"Task 1 in Vietnamese\", \"Task 2\"],\n"
        "      \"focus_topics\": [\"Topic 1\", \"Topic 2\"]\n"
        "    }}\n"
        "  ],\n"
        "  \"tips_vn\": [\"Tip 1\", \"Tip 2\"],\n"
        "  \"estimated_completion\": \"e.g. 3 months\"\n"
        "}}\n"
        "Ensure the roadmap is practical, encouraging, and highly relevant to the student's goal.\n"
        "Return ONLY the JSON."
    )
    
    chain = prompt | llm
    print(f"[LLM ROADMAP] Generating for goal: {goal}...", flush=True)
    try:
        response = await _safe_invoke_async(chain, {
            "level": level,
            "goal": goal,
            "words": words_summary,
        }, difficulty="hard", feature="Personalized Roadmap")
        return parse_json_response(response.content)
    except Exception as e:
        print(f"[LLM ROADMAP] Error: {e}")
        return {"error": "Failed to generate roadmap"}

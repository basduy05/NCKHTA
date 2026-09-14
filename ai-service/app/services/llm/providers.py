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
import time
import threading
from dotenv import load_dotenv
import re
import json_repair
import cohere
from pydantic import BaseModel, Field

from ...database import get_db, get_setting, mark_provider_failed, is_provider_failed, log_ai_request
from ..referee_service import trigger_evaluation, fast_repair_json
from ...utils.resilience import retry
from ...utils.json_utils import clean_json_string

# ─── REQUEST QUEUING (SEMAPHORE WITH ADAPTIVE CONCURRENCY) ────────────────
def _get_optimal_concurrency() -> int:
    """Dynamically determine safe AI concurrency based on available system memory.
    Optimized for Render Free Tier (512MB RAM):
    - Under 120MB available: throttle down to 3 to prevent OOM crash
    - Under 256MB available: 8 concurrent slots
    - 256MB+ available: up to 15 concurrent slots
    """
    try:
        import psutil
        mem = psutil.virtual_memory()
        avail_mb = mem.available / (1024 * 1024)
        if avail_mb < 120:
            print(f"[LLM Semaphore] Low memory ({avail_mb:.1f}MB avail). Setting to 3 concurrent slots.")
            return 3
        if avail_mb < 256:
            print(f"[LLM Semaphore] Moderate memory ({avail_mb:.1f}MB avail). Setting to 8 concurrent slots.")
            return 8
        return 15
    except Exception as e:
        print(f"[LLM Semaphore] Concurrency auto-detect fallback: {e}")
        return 10

MAX_CONCURRENT_AI_REQUESTS = _get_optimal_concurrency()
ai_semaphore = asyncio.Semaphore(MAX_CONCURRENT_AI_REQUESTS)
print(f"[LLM] Semaphore initialized with {MAX_CONCURRENT_AI_REQUESTS} slots (Adaptive RAM mode).")

def get_queue_status():
    """Returns the current number of active and waiting requests."""
    return {
        "active": max(0, MAX_CONCURRENT_AI_REQUESTS - ai_semaphore._value),
        "waiting": len(ai_semaphore._waiters) if ai_semaphore._waiters else 0,
        "max_slots": MAX_CONCURRENT_AI_REQUESTS
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
            if isinstance(parsed, (dict, list)):
                return parsed
            return {"name": "Response", "description": str(parsed)}
        except Exception:
            # 3. Fallback to json_repair for truncated or messy responses
            try:
                parsed = json_repair.repair_json(clean_text, return_objects=True)
                if isinstance(parsed, (dict, list)):
                    if isinstance(parsed, dict):
                        if not parsed.get("description") and not parsed.get("content"):
                             return {"name": "Response", "description": str(parsed)}
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
                    model_names = ["gemini-2.5-pro", "gemini-pro-latest", "gemini-2.5-flash"]
                elif difficulty == "easy":
                    model_names = ["gemini-2.5-flash-lite", "gemini-flash-lite-latest", "gemini-2.5-flash"]
                else: # medium
                    model_names = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"]
                
                print(f"[LLM DEBUG] Trying Gemini/Gemma models: {model_names}", flush=True)
                for m in model_names:
                    try:
                        print(f"[LLM] Selecting Google ({m}) | Difficulty: {difficulty}", flush=True)
                        return ChatGoogleGenerativeAI(model=m, google_api_key=gemini_key, timeout=20, temperature=0.7)
                    except Exception as e:
                        print(f"[LLM] Gemini {m} Init Failed: {e}", flush=True)
                        continue
                
                # Ultimate fallback for Google
                return ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=gemini_key, timeout=20)
        
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
        return ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=key, timeout=20) if key else None
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
            provider_name = "Gemini" if "google" in error_str or "gemini" in error_str else ("OpenAI" if "openai" in error_str else "Unknown")
            print(f"[LLM ERROR] {provider_name} Failed. Error: {e}. Falling back to Cohere...")
            mark_provider_failed(provider_name)
            
            fallback_llm = get_llm(provider="cohere")
            if fallback_llm:
                # Reconstruct chain if it's a pipe-style sequence
                fallback_chain = (chain.first | fallback_llm) if hasattr(chain, 'first') else fallback_llm
                res = fallback_chain.invoke(params)
                fallback_latency = int((time.time() - start_time) * 1000)
                
                log_ai_request(None, "invoke_fallback", "command-r-08-2024", difficulty, fallback_latency, "fallback", error_str, feature=feature, response_content=res.content)
                # TRIGGER REFEREE EVALUATION (Background)
                trigger_evaluation(None, "invoke_fallback", params, res.content, "command-r-08-2024", feature)
                return res
            
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
        if hasattr(chain, 'last') and hasattr(chain.last, 'model_name'): 
            model_name = str(getattr(chain.last, 'model_name', 'unknown'))
        elif hasattr(chain, 'last') and hasattr(chain.last, 'model'): 
            model_name = str(getattr(chain.last, 'model', 'unknown'))
        elif hasattr(chain, 'model_name'): 
            model_name = chain.model_name
        elif hasattr(chain, 'bound') and hasattr(chain.bound, 'model_name'):
            model_name = chain.bound.model_name
        
        # If it's a RunnableSequence, the last step is usually the LLM
        if hasattr(chain, 'steps') and len(chain.steps) > 0:
            last_step = chain.steps[-1]
            if hasattr(last_step, 'model_name'):
                 model_name = str(last_step.model_name)
            elif hasattr(last_step, 'model'):
                 model_name = str(last_step.model)
    except Exception as e: 
        print(f"Error getting model_name: {e}")

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
            provider_name = "Gemini" if "google" in error_str or "gemini" in error_str else ("OpenAI" if "openai" in error_str else "Unknown")
            print(f"[LLM ERROR] {provider_name} Failed (Async). Error: {e}. Falling back to Cohere...")
            mark_provider_failed(provider_name)
            
            fallback_llm = get_llm(provider="cohere")
            if fallback_llm:
                fallback_chain = (chain.first | fallback_llm) if hasattr(chain, 'first') else fallback_llm
                res = None
                if hasattr(fallback_chain, 'ainvoke'):
                    res = await fallback_chain.ainvoke(params)
                else:
                    res = await asyncio.to_thread(fallback_chain.invoke, params)
                fallback_latency = int((time.time() - start_time) * 1000)
                
                log_ai_request(None, "ainvoke_fallback", "command-r-08-2024", difficulty, fallback_latency, "fallback", error_str, feature=feature, response_content=res.content)
                
                # TRIGGER REFEREE EVALUATION (Background)
                trigger_evaluation(None, "ainvoke_fallback", params, res.content, "command-r-08-2024", feature)
                
                # Store warning
                warning = "> [!CAUTION]\n> **Cảnh báo:** API Key Gemini của bạn đã hết hạn hoặc hết hạn mức. Hệ thống sử dụng AI dự phòng với chất lượng thấp hơn. Vui lòng cập nhật API Key mới.\n\n"
                if res:
                    setattr(res, '_warning', warning)
                return res
            
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
        provider_name = "Gemini" if "google" in error_str or "gemini" in error_str else "OpenAI"
        print(f"[LLM ERROR] {provider_name} Failed (Stream). Error: {e}. Falling back to Cohere...")
        mark_provider_failed(provider_name)
        
        fallback_llm = get_llm(provider="cohere")
        if fallback_llm:
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




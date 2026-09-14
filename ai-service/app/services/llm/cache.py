import time
import threading
from typing import Optional
from ...database import get_cached_dictionary, set_cached_dictionary

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
    Lenient check: as long as we have meanings with definitions, it's valid to save.
    This prevents strict phonetic or minor field missing issues from blocking DB saves."""
    if not data or not isinstance(data, dict):
        return False
    meanings = data.get("meanings", [])
    if not meanings or len(meanings) == 0:
        return False
        
    # Check that at least one meaning has EN definition
    has_valid_meaning = any(m.get("definition_en") for m in meanings)
    return has_valid_meaning


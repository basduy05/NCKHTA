import re
from typing import Any

def clean_html(text: str) -> str:
    """
    Aggressively strips all HTML tags and script content to prevent XSS.
    This is the primary defense for name, phone, and other plain-text fields.
    """
    if not text:
        return ""
    
    # 1. Remove <script>...</script> and its content completely (case-insensitive, multiline)
    text = re.sub(r'<script.*?>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    
    # 2. Remove tags with event handlers (onerror, onload, onclick, etc.)
    # This catches cases like <img src=x onerror=...>
    text = re.sub(r'on\w+\s*=\s*".*?"', '', text, flags=re.IGNORECASE)
    text = re.sub(r"on\w+\s*=\s*'.*?'", '', text, flags=re.IGNORECASE)
    text = re.sub(r"on\w+\s*=\s*[^\s>]+", '', text, flags=re.IGNORECASE)

    # 3. Strip all remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # 4. Remove javascript: pseudo-protocol in links/attributes
    text = re.sub(r'javascript\s*:', '', text, flags=re.IGNORECASE)
    
    return text.strip()

def sanitize_json(data: Any) -> Any:
    """Recursively sanitizes values in a dictionary or list."""
    if isinstance(data, dict):
        return {k: sanitize_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_json(v) for v in data]
    elif isinstance(data, str):
        return clean_html(data)
    else:
        return data

# ---------------------------------------------------------------------------
# In-memory Sliding Window Rate Limiter (Phase 1.1)
# ---------------------------------------------------------------------------
import time
from collections import defaultdict
from fastapi import Request, HTTPException, status

class SlidingWindowRateLimiter:
    def __init__(self):
        # key -> list of timestamp floats
        self._records = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int = 5, window_seconds: int = 60) -> tuple[bool, int]:
        now = time.time()
        window_start = now - window_seconds
        
        # Filter timestamps outside the active window
        timestamps = [t for t in self._records[key] if t > window_start]
        
        if len(timestamps) >= max_requests:
            # Oldest timestamp in current window defines retry-after
            earliest = timestamps[0]
            retry_after = int(earliest + window_seconds - now) + 1
            self._records[key] = timestamps
            return False, max(1, retry_after)
            
        timestamps.append(now)
        self._records[key] = timestamps
        return True, 0

    def purge_old_keys(self, max_idle_seconds: int = 3600):
        """Periodic cleanup of keys with no recent activity."""
        now = time.time()
        stale_keys = [
            k for k, times in self._records.items() 
            if not times or (now - times[-1]) > max_idle_seconds
        ]
        for k in stale_keys:
            self._records.pop(k, None)

_global_rate_limiter = SlidingWindowRateLimiter()

def get_client_ip(request: Request) -> str:
    """Extract real client IP considering reverse proxy headers (Render/Cloudflare/Nginx)."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"

def rate_limit(max_requests: int = 5, window_seconds: int = 60, prefix: str = "auth"):
    """FastAPI dependency for rate limiting sensitive endpoints (e.g. login/OTP)."""
    async def dependency(request: Request):
        client_ip = get_client_ip(request)
        rate_key = f"{prefix}:{client_ip}"
        allowed, retry_after = _global_rate_limiter.is_allowed(
            rate_key, max_requests=max_requests, window_seconds=window_seconds
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Quá nhiều yêu cầu. Vui lòng thử lại sau {retry_after} giây.",
                headers={"Retry-After": str(retry_after)}
            )
        return True
    return dependency


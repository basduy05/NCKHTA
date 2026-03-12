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

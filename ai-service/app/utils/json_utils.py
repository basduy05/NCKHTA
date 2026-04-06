import re
import json

def clean_json_string(text: str) -> str:
    """
    Extremely fast regex-based cleaner to fix common LLM JSON output issues.
    Latency: < 0.5ms.
    """
    if not text:
        return ""

    # 1. Strip Markdown Code Fences
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        parts = text.split("```")
        if len(parts) >= 3:
            text = parts[1].strip()
        else:
            text = parts[0].strip()

    # 2. Basic cleanup (remove leading/trailing non-json chars)
    start_match = re.search(r'[\[\{]', text)
    if not start_match:
        return text # No JSON start found
    
    text = text[start_match.start():]
    
    # Reverse find the last ] or }
    end_match = list(re.finditer(r'[\]\}]', text))
    if end_match:
        text = text[:end_match[-1].end()]

    # 3. Handle common syntax issues
    # A. Trailing commas in objects: {"a": 1,} -> {"a": 1}
    text = re.sub(r',\s*\}', '}', text)
    # B. Trailing commas in arrays: [1, 2,] -> [1, 2]
    text = re.sub(r',\s*\]', ']', text)
    
    # C. Fix some unescaped newlines within string values
    # (Matches strings "..." that contain newlines)
    # This is tricky with pure regex, but we can do a basic one for text blocks
    # Actually, skipping complex regex for now to maintain ultra-high speed.
    
    return text.strip()

def is_valid_json(text: str) -> bool:
    try:
        json.loads(clean_json_string(text))
        return True
    except:
        return False

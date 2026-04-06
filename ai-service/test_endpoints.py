"""Test all AI endpoints with correct routes"""
import requests
import time

BASE = "http://localhost:8000"

def test(name, method, url, body=None, timeout=60):
    try:
        start = time.time()
        if method == "GET":
            r = requests.get(BASE + url, timeout=timeout)
        else:
            r = requests.post(BASE + url, json=body, timeout=timeout)
        ms = int((time.time() - start) * 1000)
        
        if r.status_code == 401:
            print(f"AUTH {name}: {ms}ms (needs login token)")
            return
        
        data = r.json()
        error = data.get("error") or data.get("detail")
        if r.status_code >= 400 or error:
            print(f"FAIL {name}: {ms}ms | {r.status_code} | {str(error)[:80]}")
        else:
            keys = list(data.keys())[:5]
            print(f"OK   {name}: {ms}ms | keys: {keys}")
    except requests.exceptions.Timeout:
        print(f"TIMEOUT {name}: >{timeout}s")
    except Exception as e:
        print(f"ERR  {name}: {str(e)[:80]}")

print("=== TESTING AI ENDPOINTS ===\n")

# Public endpoints
test("Health", "GET", "/health")

# Student endpoints (need auth token)
test("Dictionary", "POST", "/student/dictionary/lookup", {"word": "hello"})
test("Grammar List", "GET", "/student/grammar")
test("Grammar Practice", "POST", "/student/grammar/practice", {"topic": "present simple", "difficulty": "easy", "count": 3})
test("IPA Generate", "POST", "/student/ipa/generate", {"topic": "short vowels"})
test("Vocab Extract", "POST", "/vocabulary/extract", {"text": "The quick brown fox jumps over the lazy dog"})

# Admin endpoints (need admin auth)
test("AI Stats", "GET", "/admin/ai-stats")
test("AI Logs", "GET", "/admin/ai-logs")

print("\nNote: AUTH = endpoint requires login token. This is expected.")
print("To test with auth, use the frontend browser.")

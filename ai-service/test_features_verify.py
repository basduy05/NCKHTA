import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(url, desc):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "VerificationBot"})
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"[{status}] {desc}: {body[:80]}...")
            return True
    except Exception as e:
        print(f"[FAIL] {desc}: {e}")
        return False

print("Verifying iEdu Enhanced Backend Endpoints...")
test_endpoint(f"{BASE_URL}/health", "Health Check")
test_endpoint(f"{BASE_URL}/chat/suggestions/general", "Chat Suggestions")

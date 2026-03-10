import requests
import json
import sqlite3
import time

API_URL = "http://localhost:8000"

def get_db():
    return sqlite3.connect("app/app.db")

def login_as_teacher(email="giangvien@test.com", password="password"):
    res = requests.post(f"{API_URL}/auth/login", json={"email": email, "password": password})
    if res.status_code == 200:
        return res.json().get("access_token")
    return None

def test_grammar_injection():
    print("Testing Grammar Injection via /teacher/file/generate-assignment")
    # Setup test teacher
    conn = get_db()
    conn.execute("INSERT OR IGNORE INTO users (name, email, role, password_hash, is_verified) VALUES ('Test Teacher', 'tt@test.com', 'TEACHER', '$2b$12$Z/bWlJq1t1X0i6YlF7M/1uR.V6iW1mB7hA/Z/bWlJq1t1X0i6YlF7', 1)")
    conn.commit()
    conn.close()
    
    # Needs real teacher token
    # Alternatively we can run the internal function directly for testing to bypass auth
    print("Using Python internal direct function call to bypass auth for testing...")
    
    code = f"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.llm_service import generate_exercises_from_text

# Sample text
text = "The boy is playing in the garden. He has lived here for ten years."
res = generate_exercises_from_text(text, exercise_type="mcq", num_questions=2)
print("SUCCESS" if "exercises" in res else "FAILED")
if "exercises" in res:
   print(res["exercises"][0]["question"])
"""
    with open("test_llm.py", "w") as f:
        f.write(code)

if __name__ == "__main__":
    test_grammar_injection()

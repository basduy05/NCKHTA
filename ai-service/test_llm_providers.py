import os
import sys
from dotenv import load_dotenv

# Add app directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.llm_service import get_llm

def test_provider(name):
    print(f"\n--- Testing Provider: {name} ---")
    llm = get_llm(provider=name)
    if not llm:
        print(f"Provider {name} not configured (no API key).")
        return
    
    try:
        res = llm.invoke("Hello, who are you?")
        print(f"Response: {res.content[:100]}...")
        print("Status: OK")
    except Exception as e:
        print(f"Status: FAILED")
        print(f"Error: {e}")

if __name__ == "__main__":
    load_dotenv()
    test_provider("google")
    test_provider("cohere")
    test_provider("openai")

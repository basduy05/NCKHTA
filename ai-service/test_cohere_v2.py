import os
import cohere
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("COHERE_API_KEY")
if not api_key:
    print("No COHERE_API_KEY found")
    exit(1)

try:
    co = cohere.Client(api_key)
    response = co.chat(
        message="Hello, are you working?",
        model="command"
    )
    print(f"Cohere (command) Success: {response.text[:50]}...")
except Exception as e:
    print(f"Cohere (command) Failed: {e}")

"""Clean sequential test - outputs JSON for reliable parsing"""
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_cohere import ChatCohere
from dotenv import load_dotenv
import os, time, json

load_dotenv()
gemini_key = os.getenv("GOOGLE_API_KEY")
cohere_key = os.getenv("COHERE_API_KEY")

results = []

# GEMINI / GEMMA
for m in ["gemini-3.1-flash-lite", "gemini-3-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemma-3-27b", "gemma-3-12b"]:
    try:
        start = time.time()
        llm = ChatGoogleGenerativeAI(model=m, google_api_key=gemini_key, timeout=20, temperature=0.7)
        r = llm.invoke("Say hello")
        ms = int((time.time() - start) * 1000)
        results.append({"p": "Gemini", "m": m, "s": "OK", "ms": ms})
    except Exception as e:
        results.append({"p": "Gemini", "m": m, "s": "FAIL", "e": str(e)[:80]})

# COHERE
for m in ["command-a-03-2025", "command-a-reasoning-08-2025", "command-r-08-2024", "command-r", "tiny-aya-fire"]:
    try:
        start = time.time()
        llm = ChatCohere(model=m, cohere_api_key=cohere_key, temperature=0.7)
        r = llm.invoke("Say hello")
        ms = int((time.time() - start) * 1000)
        results.append({"p": "Cohere", "m": m, "s": "OK", "ms": ms})
    except Exception as e:
        results.append({"p": "Cohere", "m": m, "s": "FAIL", "e": str(e)[:80]})

# Write JSON file
with open("model_results.json", "w") as f:
    json.dump(results, f, indent=2)
print("DONE - see model_results.json")

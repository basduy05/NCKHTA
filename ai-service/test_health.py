import requests
import subprocess
import time
import httpx

def run():
    # Start server
    proc = subprocess.Popen(["python", "-m", "uvicorn", "app.main:app", "--port", "8009"])
    time.sleep(4)
    try:
        r = requests.get("http://127.0.0.1:8009/health/graph")
        print("Health:", r.json())
        
        r2 = requests.post("http://127.0.0.1:8009/analyze-text", json={"text": "hello world", "num_questions": 5})
        print("Analyze result:", r2.json())
        
    except Exception as e:
        print("Error:", e)
    finally:
        proc.terminate()

run()

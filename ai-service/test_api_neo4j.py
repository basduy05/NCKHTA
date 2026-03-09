import requests
import time
import subprocess
import threading

def run_server():
    subprocess.run(["python", "-m", "uvicorn", "app.main:app", "--port", "8008"])

# Start server in background thread
t = threading.Thread(target=run_server, daemon=True)
t.start()

time.sleep(3) # Wait for server to start

try:
    resp = requests.post("http://localhost:8008/admin/settings/test-neo4j")
    print("Status:", resp.status_code)
    print("Response:", resp.json())
except Exception as e:
    print("Error calling API:", e)

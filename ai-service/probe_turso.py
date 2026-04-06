import os
from dotenv import load_dotenv
import libsql_experimental as libsql

load_dotenv()

def probe_db():
    TURSO_URL = os.getenv("TURSO_URL")
    TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")
    
    print(f"URL: {TURSO_URL}")
    print(f"Token: {TURSO_AUTH_TOKEN[:10]}...")
    
    try:
        url = TURSO_URL.replace("libsql://", "https://")
        conn = libsql.connect(url, auth_token=TURSO_AUTH_TOKEN)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        print("Connection to Turso SUCCESSFUL")
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_logs'")
        if cursor.fetchone():
            print("Table ai_logs EXISTS on Turso")
        else:
            print("Table ai_logs MISSING on Turso")
        
        conn.close()
    except Exception as e:
        print(f"Connection to Turso FAILED: {e}")

if __name__ == "__main__":
    probe_db()

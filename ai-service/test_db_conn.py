import os
import sqlite3
import traceback
from dotenv import load_dotenv

# Try to import libsql if possible
try:
    import libsql_experimental as libsql
    print("[INFO] Using libsql_experimental")
except ImportError:
    try:
        import libsql
        print("[INFO] Using libsql")
    except ImportError:
        import sqlite3 as libsql
        print("[INFO] Falling back to standard sqlite3 (may not support remote URLs)")

def test_connection():
    load_dotenv()
    
    url = os.getenv("TURSO_URL")
    token = os.getenv("TURSO_AUTH_TOKEN")
    
    print(f"Connecting to: {url}")
    print(f"Token length: {len(token) if token else 0}")
    
    try:
        # For Turso, we often need to replace libsql:// with https:// if using standard drivers
        if url.startswith("libsql://"):
            http_url = url.replace("libsql://", "https://")
            print(f"Attempting connection with HTTP URL: {http_url}")
            conn = libsql.connect(http_url, auth_token=token)
        else:
            conn = libsql.connect(url, auth_token=token)
            
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        print(f"Connection SUCCESS! Result: {result}")
        conn.close()
    except Exception as e:
        print("Connection FAILED!")
        traceback.print_exc()

if __name__ == "__main__":
    test_connection()

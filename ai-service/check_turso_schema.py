import libsql
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("TURSO_URL")
token = os.getenv("TURSO_AUTH_TOKEN")

print(f"Connecting to: {url}")

try:
    conn = libsql.connect(url, auth_token=token)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(dictionary_cache)")
    rows = cursor.fetchall()
    print("Table dictionary_cache info:")
    for row in rows:
        print(row)
    
    # Also check if it works to select it
    try:
        cursor.execute("SELECT data FROM dictionary_cache LIMIT 1")
        print("SELECT data worked!")
    except Exception as e:
        print(f"SELECT data FAILED: {e}")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")

import sqlite3
import os

db_path = 'ai-service/app/app.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
try:
    cursor.execute("SELECT value FROM settings WHERE key = 'COHERE_API_KEY';")
    row = cursor.fetchone()
    if row:
        print(f"COHERE_API_KEY in DB: {row[0][:10]}...")
    else:
        print("COHERE_API_KEY not found in DB.")
except Exception as e:
    print(f"Error: {e}")
conn.close()

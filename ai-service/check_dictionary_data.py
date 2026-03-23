import sqlite3
import json
import os

db_path = 'app/app.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

print("--- dictionary_cache table info ---")
cursor = conn.execute("PRAGMA table_info(dictionary_cache)")
for row in cursor:
    print(dict(row))

print("\n--- dictionary_cache sample data ---")
cursor = conn.execute("SELECT word, word_original, meanings_count, updated_at FROM dictionary_cache LIMIT 10")
for row in cursor:
    print(dict(row))

print("\n--- users table info ---")
cursor = conn.execute("PRAGMA table_info(users)")
for row in cursor:
    print(dict(row))

print("\n--- users sample data (credits_ai focus) ---")
cursor = conn.execute("SELECT id, name, email, role, credits_ai FROM users LIMIT 10")
for row in cursor:
    print(dict(row))

conn.close()

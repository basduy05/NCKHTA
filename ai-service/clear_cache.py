from app.database import get_db
import json

conn = get_db()
print("Checking for cached errors in dictionary_cache...")

# Check 'student'
res = conn.execute("SELECT data_json FROM dictionary_cache WHERE word=?", ("student",)).fetchone()
if res:
    data = json.loads(res[0])
    print(f"Student cache: {data.get('error', 'No error')}")
    if "error" in data:
        conn.execute("DELETE FROM dictionary_cache WHERE word=?", ("student",))
        print("Deleted cached error for 'student'")

# Find all cached errors
cursor = conn.execute("SELECT word, data_json FROM dictionary_cache")
count = 0
for row in cursor.fetchall():
    word, data_json = row
    data = json.loads(data_json)
    if "error" in data or not data.get("meanings"):
        conn.execute("DELETE FROM dictionary_cache WHERE word=?", (word,))
        count += 1
        print(f"Deleted errored cache for: {word}")

conn.commit()
conn.close()
print(f"Cleanup complete. Deleted {count} error caches.")

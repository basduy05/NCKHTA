import os
import json
from dotenv import load_dotenv
from app.database import get_db

load_dotenv()

def diagnostic():
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 1. Dictionary Cache
        cursor.execute("SELECT COUNT(*) as count FROM dictionary_cache")
        count_dict = cursor.fetchone()['count']
        print(f"DEBUG: Total Dictionary Cache: {count_dict}")
        if count_dict > 0:
            cursor.execute("SELECT word FROM dictionary_cache LIMIT 3")
            print(f"  - Sample: {[r['word'] for r in cursor.fetchall()]}")
            
        # 2. Vocabulary distribution
        cursor.execute("SELECT user_id, COUNT(*) as vocab_count FROM saved_vocabulary GROUP BY user_id")
        dist = cursor.fetchall()
        print("DEBUG: Vocabulary distribution per User ID:")
        for d in dist:
            print(f"  - User {d['user_id']}: {d['vocab_count']} words")
            
        # 3. Check for leftover malicious users (bwmyga.com)
        cursor.execute("SELECT id, email, name FROM users WHERE email LIKE '%@bwmyga.com' OR name LIKE '%<%'")
        leftovers = cursor.fetchall()
        if leftovers:
            print(f"WARNING: Found {len(leftovers)} suspicious users remaining!")
            for l in leftovers:
                print(f"  - ID: {l['id']}, Email: {l['email']}, Name: {l['name']}")

        # 4. Check for 'not to fetch' or 'not found' symptoms
        # Maybe check dictionary_cache for corrupt JSON?
        if count_dict > 0:
            cursor.execute("SELECT word, data_json FROM dictionary_cache LIMIT 1")
            row = cursor.fetchone()
            try:
                json.loads(row['data_json'])
                print(f"DEBUG: JSON parsing test for '{row['word']}': OK")
            except Exception as ex:
                print(f"ERROR: Corrupt JSON for word '{row['word']}': {ex}")

    except Exception as e:
        print(f"DIAGNOSTIC FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    diagnostic()

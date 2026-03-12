import os
from dotenv import load_dotenv
from app.database import get_db

load_dotenv()

def full_inspect():
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 1. Users
        cursor.execute("SELECT id, email, name FROM users")
        users = cursor.fetchall()
        print("--- USERS ---")
        for u in users:
            print(f"ID: {u['id']} | Email: {u['email']} | Name: {u['name']}")
            
        # 2. Malicious patterns in users
        cursor.execute("SELECT id, name FROM users WHERE name LIKE '%<%' OR name LIKE '%script%'")
        malicious_users = cursor.fetchall()
        print("\n--- MALICIOUS USERS ---")
        for mu in malicious_users:
            print(f"ID: {mu['id']} | Name: {mu['name']}")
            
        # 3. dictionary_cache
        cursor.execute("SELECT word FROM dictionary_cache")
        words = cursor.fetchall()
        print("\n--- DICTIONARY CACHE WORDS ---")
        malicious_words = []
        for w in words:
            word = w['word']
            if '<' in word or 'script' in word.lower() or 'onerror' in word.lower():
                malicious_words.append(word)
            else:
                # print(f"Word: {word}") # Too many
                pass
        
        print(f"Total Words: {len(words)}")
        print(f"Malicious Words Found: {len(malicious_words)}")
        for mw in malicious_words:
            print(f"  - {mw}")

        # 4. saved_vocabulary stats
        cursor.execute("SELECT user_id, word FROM saved_vocabulary")
        vocab_items = cursor.fetchall()
        print("\n--- ALL SAVED VOCABULARY ---")
        for vi in vocab_items:
            print(f"User {vi['user_id']}: {vi['word']}")
            
        cursor.execute("SELECT user_id, COUNT(*) as count FROM saved_vocabulary GROUP BY user_id")
        stats = cursor.fetchall()
        print("\n--- VOCAB STATS BY USER ---")
        for s in stats:
            print(f"User ID: {s['user_id']} | Count: {s['count']}")

    except Exception as e:
        print(f"INSPECTION ERROR: {e}")

if __name__ == "__main__":
    full_inspect()

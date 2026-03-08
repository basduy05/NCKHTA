import sqlite3
import json
import os

dbs = ['app/app.db', 'app/iedu.db']
for db in dbs:
    if os.path.exists(db):
        print(f"--- DB: {db} ---")
        try:
            conn = sqlite3.connect(db)
            # dictionary_cache
            try:
                row = conn.execute('SELECT data_json FROM dictionary_cache WHERE word=?', ('serendipity',)).fetchone()
                if row:
                    print("Found in dictionary_cache:")
                    print(json.dumps(json.loads(row[0]), indent=2, ensure_ascii=False)[:1000]) # Print first 1000 chars
                else:
                    print("Not in dictionary_cache")
            except Exception as e:
                print("dictionary_cache error:", e)
                
            # saved_vocabulary
            try:
                row2 = conn.execute('SELECT * FROM saved_vocabulary WHERE word=?', ('serendipity',)).fetchone()
                if row2:
                    print("Found in saved_vocabulary:", row2)
                else:
                    print("Not in saved_vocabulary")
            except Exception as e:
                print("saved_vocabulary error:", e)
        except Exception as e:
            print("DB error:", e)

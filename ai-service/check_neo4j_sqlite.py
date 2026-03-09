import sqlite3
import json

out = {}
def check_db(db_path):
    out[db_path] = []
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        if 'settings' in tables:
            cursor.execute("SELECT key, value FROM settings")
            rows = cursor.fetchall()
            for row in rows:
                if 'neo4j' in row[0].lower():
                    out[db_path].append(row)
        conn.close()
    except Exception as e:
        out[db_path].append(str(e))

check_db('c:/Users/basdu/Downloads/NCKHTA/ai-service/app/app.db')
check_db('c:/Users/basdu/Downloads/NCKHTA/ai-service/app.db')

with open("sqlite_out2.txt", "w") as f:
    json.dump(out, f, indent=2)

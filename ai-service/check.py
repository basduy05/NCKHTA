import sqlite3

def print_tables(db_path):
    print(f"--- DB: {db_path} ---")
    try:
        c = sqlite3.connect(db_path)
        tables = [r[0] for r in c.execute('SELECT name FROM sqlite_master WHERE type="table"').fetchall()]
        print(f"Tables: {', '.join(tables)}")
        if "dictionary_cache" in tables:
            row = c.execute("SELECT data_json FROM dictionary_cache WHERE word='accomplish'").fetchone()
            print("accomplish row:", "found" if row else "not found")
            if row:
                print(row[0][:500]) # print prefix
    except Exception as e:
        print(f"Error: {e}")

print_tables('c:/Users/basdu/Downloads/NCKHTA/ai-service/app/app.db')
print_tables('c:/Users/basdu/Downloads/NCKHTA/ai-service/app.db')

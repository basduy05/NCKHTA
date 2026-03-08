import sqlite3
import pprint
import json

with open("db_output.txt", "w", encoding="utf-8") as f:
    def print_tables(db_path):
        f.write(f"--- DB: {db_path} ---\n")
        try:
            c = sqlite3.connect(db_path)
            tables = [r[0] for r in c.execute('SELECT name FROM sqlite_master WHERE type="table"').fetchall()]
            f.write(f"Tables: {', '.join(tables)}\n")
            if "dictionary_cache" in tables:
                row = c.execute("SELECT data_json FROM dictionary_cache WHERE word='accomplish'").fetchone()
                f.write("accomplish row: " + ("found" if row else "not found") + "\n")
                if row:
                    data = json.loads(row[0])
                    f.write(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        except Exception as e:
            f.write(f"Error: {e}\n")

    print_tables('c:/Users/basdu/Downloads/NCKHTA/ai-service/app/app.db')
    print_tables('c:/Users/basdu/Downloads/NCKHTA/ai-service/app.db')

print("done")

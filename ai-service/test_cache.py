import sqlite3, json
with sqlite3.connect('c:/Users/basdu/Downloads/NCKHTA/ai-service/app/app.db') as c:
    row = c.execute("SELECT data_json FROM dictionary_cache WHERE word='accomplish'").fetchone()
    if row:
        print(json.dumps(json.loads(row[0]), indent=2))
    else:
        print('Not found')

import sqlite3, json
with sqlite3.connect('c:/Users/basdu/Downloads/NCKHTA/ai-service/app.db') as c:
    row = c.execute("SELECT data_json FROM dictionary_cache WHERE word='accomplish'").fetchone()
    if row:
        print(row[0])
    else:
        print('Not found')

import libsql
import os
import json
from dotenv import load_dotenv

load_dotenv('.env')
url = os.getenv('TURSO_URL')
token = os.getenv('TURSO_AUTH_TOKEN')
conn = libsql.connect(url, auth_token=token)
c = conn.cursor()
c.execute("SELECT word, data_json FROM dictionary_cache ORDER BY updated_at DESC LIMIT 5")
rows = c.fetchall()
for r in rows:
    data = json.loads(r[1])
    idioms = data.get('idioms', [])
    print(r[0])
    for item in idioms:
        print("  - ", item)

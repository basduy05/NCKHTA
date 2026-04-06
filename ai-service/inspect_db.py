import sqlite3
import os

db_path = 'app/app.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print(f"File size: {os.path.getsize(db_path)} bytes")

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]
print(f"Tables: {tables}")

for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"Table {table}: {count} rows")

conn.close()

import os
import sys

os.environ["FORCE_LOCAL_DB"] = "1"
os.environ["ONLINE_DB_ONLY"] = "0"
sys.path.insert(0, ".")

from app.database import get_db, init_db
init_db()

conn = get_db()
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("Tables in DB:", tables)
print("Has parent_student_links:", "parent_student_links" in tables)
if "parent_student_links" in tables:
    cur.execute("SELECT * FROM parent_student_links")
    print("Links rows:", cur.fetchall())

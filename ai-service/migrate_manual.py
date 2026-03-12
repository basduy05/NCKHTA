
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.database import init_db, get_db

print("Manually triggering init_db()...")
try:
    init_db()
    print("init_db() completed.")
except Exception as e:
    print(f"Error during init_db(): {e}")

print("Verifying credits_ai column...")
try:
    conn = get_db()
    cursor = conn.execute("PRAGMA table_info(users)")
    cols = [r[1] for r in cursor.fetchall()]
    if "credits_ai" in cols:
        print("SUCCESS: credits_ai found.")
    else:
        print("FAILURE: credits_ai still missing.")
    conn.close()
except Exception as e:
    print(f"Error during verification: {e}")

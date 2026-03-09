import os

os.environ["TURSO_URL"] = "libsql://nckhta-basduy05.aws-ap-northeast-1.turso.io"
os.environ["TURSO_AUTH_TOKEN"] = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzMwMjYxMjYsImlkIjoiMDE5Y2QwOTUtMDEwMS03NzM2LWEyODEtMTczNTA3NTc3ZmUxIiwicmlkIjoiMTQwNTcxYzgtNTUzYS00NjE4LWI4MzYtOTA4MzMzZWQwMWM2In0.pcBDvE0YKELXezQrZK3T_ulxTSOaq5-m7yfhgsJ3XJtK8dxLpr6MHk3jhm0QdhSPg2YG7Yf0DAU1RpoT_PBIBA"

import importlib
import app.database as db
importlib.reload(db)

def test_db():
    print("Testing DB connection...")
    try:
        conn = db.get_db()
        print(f"Connection object: {type(conn)}")
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        print("Test query successful")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_db()

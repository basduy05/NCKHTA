import os
import sys
from pydantic import BaseModel, Field
from typing import Optional
from app.database import get_db

print("Starting debug script")
try:
    print("Calling get_db()")
    conn = get_db()
    print("Got db:", type(conn))
    cursor = conn.cursor()
    print("Executing SELECT...")
    cursor.execute("SELECT id, name, role, password_hash, is_verified, phone FROM users LIMIT 1")
    print("Fetching one...")
    user = cursor.fetchone()
    print("User fetch result:", user)
    conn.close()
    print("Done")
except Exception as e:
    print("Error:", e)
    import traceback
    traceback.print_exc()

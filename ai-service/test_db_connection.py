import os
import sys
from pathlib import Path

# Add app to path
sys.path.append(str(Path(__file__).parent.parent))

from app.database import get_db, init_db

def test_db():
    print("Testing DB connection...")
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM users LIMIT 1")
        row = cursor.fetchone()
        print(f"Connection OK. User: {row['name'] if row else 'None'}")
        
        print("Checking revoked_tokens table...")
        cursor.execute("SELECT COUNT(*) FROM revoked_tokens")
        count_before = cursor.fetchone()[0]
        print(f"Current revoked tokens: {count_before}")
        
        print("Testing write access to revoked_tokens...")
        import secrets
        test_jti = f"test_{secrets.token_hex(4)}"
        cursor.execute("INSERT INTO revoked_tokens (jti, expires_at) VALUES (?, ?)", (test_jti, 9999999999))
        conn.commit()
        print("Write OK.")
        
        cursor.execute("DELETE FROM revoked_tokens WHERE jti = ?", (test_jti,))
        conn.commit()
        print("Cleanup OK.")
        
        conn.close()
        print("Test passed!")
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_db()

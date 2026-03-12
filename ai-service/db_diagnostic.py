import os
from dotenv import load_dotenv
from app.database import get_db

load_dotenv()

def diagnostic():
    url = os.getenv("TURSO_URL")
    token = os.getenv("TURSO_AUTH_TOKEN")
    print(f"DEBUG: TURSO_URL={url[:20] if url else 'MISSING'}...")
    print(f"DEBUG: HAS_TOKEN={'YES' if token else 'NO'}")
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check users
        cursor.execute("SELECT id, email FROM users")
        users = cursor.fetchall()
        print(f"DEBUG: Users found: {len(users)}")
        for u in users:
            print(f"  - ID: {u['id']}, Email: {u['email']}")
            
        # Check vocabulary
        cursor.execute("SELECT COUNT(*) as count FROM saved_vocabulary")
        count = cursor.fetchone()['count']
        print(f"DEBUG: Total Saved Vocabulary: {count}")
        
        # Check if local app.db exists
        if os.path.exists("app/app.db"):
            print(f"DEBUG: local app.db size: {os.path.getsize('app/app.db')} bytes")
        else:
            print("DEBUG: local app.db NOT found in app/")
            # Check root
            if os.path.exists("app.db"):
                print(f"DEBUG: local app.db size in root: {os.path.getsize('app.db')} bytes")

    except Exception as e:
        print(f"DIAGNOSTIC FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    diagnostic()

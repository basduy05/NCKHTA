import sys
import os

# Add app directory to path
sys.path.append(os.path.join(os.getcwd(), "app"))

try:
    from app.database import get_db
    print("[INFO] Successfully imported get_db from app.database")
except ImportError:
    try:
        from database import get_db
        print("[INFO] Successfully imported get_db from database")
    except Exception as e:
        print(f"[ERROR] Failed to import get_db: {e}")
        sys.exit(1)

def test_app_get_db():
    print("Testing get_db()...")
    try:
        conn = get_db()
        print("[SUCCESS] Connection object created")
        
        # Test a simple query
        cursor = conn.execute("SELECT 1")
        result = cursor.fetchone()
        print(f"[SUCCESS] Query executed. Result: {result}")
        
        # Test if we can see the 'users' table (common table)
        try:
            cursor = conn.execute("SELECT COUNT(*) FROM users")
            count = cursor.fetchone()[0]
            print(f"[SUCCESS] Found {count} users in 'users' table")
        except Exception as table_err:
            print(f"[WARNING] Could not query 'users' table: {table_err}")
            
        conn.close()
        print("[INFO] Connection closed safely")
    except Exception as e:
        print("[FAILED] get_db() failed with error:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_app_get_db()

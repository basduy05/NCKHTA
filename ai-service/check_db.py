import sqlite3
import os

def verify_db():
    try:
        # The correct path as shown in init_db output
        db_path = 'app/app.db'
        if not os.path.exists(db_path):
            print(f"Database file NOT found at {db_path}!")
            return
            
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_logs'")
        if not cursor.fetchone():
            print("Table ai_logs does NOT exist in " + db_path)
            return
            
        print(f"Table ai_logs exists in {db_path}. Table Info:")
        cursor.execute("PRAGMA table_info(ai_logs)")
        for row in cursor.fetchall():
            print(dict(row))
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_db()

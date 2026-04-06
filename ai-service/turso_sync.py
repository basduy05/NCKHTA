import sys
import os

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.database import get_db
import sqlite3

def migrate_turso():
    print("Connecting to Turso/Database...")
    db = get_db()
    
    # 1. Add feature column if missing
    print("Checking for 'feature' column...")
    try:
        db.execute("ALTER TABLE ai_logs ADD COLUMN feature TEXT")
        db.commit()
        print("Added 'feature' column to Turso.")
    except Exception as e:
        if "duplicate column name" in str(e).lower():
            print("'feature' column already exists on Turso.")
        else:
            print(f"Update failed or column exists: {e}")

    # 2. Add local_time column
    try:
        db.execute("ALTER TABLE ai_logs ADD COLUMN local_time TIMESTAMP")
        db.commit()
        print("Added 'local_time' column to Turso.")
    except Exception:
        pass

    # 3. Categorize old logs
    print("Categorizing historical logs...")
    mapping = [
        ('%dict%', 'Dictionary Lookup'),
        ('%grammar%', 'Grammar Practice'),
        ('%luyen_ngu_phap%', 'Grammar Practice'),
        ('%vocab%', 'Vocab Extraction'),
        ('%reading%', 'Reading Passage'),
        ('%ipa%', 'IPA Lesson'),
        ('%writing%', 'Writing Evaluation'),
        ('%quiz%', 'Quiz Generation'),
    ]

    total_updated = 0
    for pattern, feature_name in mapping:
        res = db.execute(
            "UPDATE ai_logs SET feature = ? WHERE (feature IS NULL OR feature = '') AND endpoint LIKE ?",
            (feature_name, pattern)
        )
        total_updated += res.rowcount

    # Final fallback for anything still NULL
    res = db.execute("UPDATE ai_logs SET feature = 'Legacy' WHERE feature IS NULL OR feature = ''")
    total_updated += res.rowcount

    db.commit()
    print(f"Turso Migration complete. Total records updated: {total_updated}")

if __name__ == "__main__":
    migrate_turso()

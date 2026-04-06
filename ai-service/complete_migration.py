import sqlite3
import os

db_path = 'app/app.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print(f"Checking schema for {db_path}...")

# 1. Add feature column if missing
try:
    cursor.execute("ALTER TABLE ai_logs ADD COLUMN feature TEXT")
    print("Added 'feature' column.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("'feature' column already exists.")
    else:
        print(f"Error adding column: {e}")

# 2. Add local_time column if missing (legacy support)
try:
    cursor.execute("ALTER TABLE ai_logs ADD COLUMN local_time TIMESTAMP")
    print("Added 'local_time' column.")
except sqlite3.OperationalError:
    pass

# 3. Categorize old logs
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
    cursor.execute(
        "UPDATE ai_logs SET feature = ? WHERE (feature IS NULL OR feature = '') AND endpoint LIKE ?",
        (feature_name, pattern)
    )
    total_updated += cursor.rowcount

# Final fallback for anything still NULL
cursor.execute("UPDATE ai_logs SET feature = 'Legacy' WHERE feature IS NULL OR feature = ''")
total_updated += cursor.rowcount

conn.commit()
conn.close()

print(f"Migration complete. Total records updated/categorized: {total_updated}")

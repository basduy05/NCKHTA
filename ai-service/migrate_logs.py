import sqlite3

db_path = 'app/app.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Starting migration of old AI logs...")

# Use a mapping of endpoint patterns to feature names
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
        "UPDATE ai_logs SET feature = ? WHERE feature IS NULL AND endpoint LIKE ?",
        (feature_name, pattern)
    )
    total_updated += cursor.rowcount

# Final fallback for anything still NULL
cursor.execute("UPDATE ai_logs SET feature = 'Legacy' WHERE feature IS NULL")
total_updated += cursor.rowcount

conn.commit()
conn.close()

print(f"Migration complete. Total records updated: {total_updated}")

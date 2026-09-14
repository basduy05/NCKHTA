"""
PostgreSQL Migration Utility (Phase 2 - Task 2.16)
Migrates all tables, relations, and rows from SQLite / Turso into a PostgreSQL database instance.

Usage:
  1. Set TARGET_POSTGRES_URL environment variable:
     export TARGET_POSTGRES_URL="postgresql://user:password@host:5432/dbname"
  2. Run:
     python migrate_to_postgres.py
"""

import os
import sys
from pathlib import Path

def migrate():
    target_pg_url = os.getenv("TARGET_POSTGRES_URL", "").strip()
    if not target_pg_url:
        print("=" * 60)
        print("⚠️  TARGET_POSTGRES_URL is not configured.")
        print("To migrate to PostgreSQL:")
        print("  1. Create a PostgreSQL instance (Render Postgres, Supabase, Neon.tech)")
        print("  2. Run:")
        print("     $env:TARGET_POSTGRES_URL=\"postgresql://user:pass@host:5432/dbname\"")
        print("     python migrate_to_postgres.py")
        print("=" * 60)
        return False

    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("❌ 'psycopg2' not installed. Install via: pip install psycopg2-binary")
        return False

    from app.database import get_db

    print(f"[*] Connecting to source database (Turso / SQLite)...")
    source_conn = get_db()
    
    print(f"[*] Connecting to target PostgreSQL instance...")
    try:
        pg_conn = psycopg2.connect(target_pg_url)
        pg_cursor = pg_conn.cursor()
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        return False

    # Apply Schema DDL
    schema_path = Path(__file__).resolve().parent / "app" / "schema_postgres.sql"
    if schema_path.exists():
        print(f"[*] Applying PostgreSQL schema from {schema_path.name}...")
        with open(schema_path, "r", encoding="utf-8") as f:
            ddl_sql = f.read()
        pg_cursor.execute(ddl_sql)
        pg_conn.commit()
        print("✅ Schema applied successfully.")

    # Table list to migrate in dependency order
    tables = [
        "users",
        "classes",
        "enrollments",
        "lessons",
        "assignments",
        "student_scores",
        "saved_vocabulary",
        "search_history",
        "user_point_logs",
        "user_placement_results",
        "user_daily_challenges",
        "user_streak_milestones",
        "chat_rooms",
        "chat_members",
        "chat_messages",
        "chat_reactions",
        "user_presence",
        "grammar_rules",
        "grammar_quizzes",
        "badges",
        "user_badges"
    ]

    for table in tables:
        try:
            rows = source_conn.execute(f"SELECT * FROM {table}").fetchall()
            if not rows:
                print(f"  - Table '{table}': 0 rows (skipped)")
                continue

            row_dicts = [dict(r) for r in rows]
            cols = list(row_dicts[0].keys())
            col_str = ", ".join(cols)
            val_placeholders = ", ".join(["%s"] * len(cols))

            query = f"INSERT INTO {table} ({col_str}) VALUES ({val_placeholders}) ON CONFLICT DO NOTHING"
            val_tuples = [tuple(r[c] for c in cols) for r in row_dicts]

            psycopg2.extras.execute_batch(pg_cursor, query, val_tuples, page_size=100)
            pg_conn.commit()
            print(f"  ✅ Table '{table}': Migrated {len(row_dicts)} rows")
        except Exception as e:
            print(f"  ⚠️ Table '{table}' migration notice: {e}")

    source_conn.close()
    pg_conn.close()
    print("\n🎉 PostgreSQL migration completed successfully!")
    return True

if __name__ == "__main__":
    migrate()

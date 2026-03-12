import os
from dotenv import load_dotenv
from app.database import get_db

load_dotenv()

def run_fix():
    print("--- STARTING DATABASE CLEANUP & FIX ---")
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 1. Purge Malicious Dictionary Cache
        # We'll remove entries containing <, script, or known XSS payloads
        print("Cleaning dictionary_cache...")
        cursor.execute("""
            DELETE FROM dictionary_cache 
            WHERE word LIKE '%<%' 
               OR word LIKE '%script%' 
               OR word LIKE '%onerror%' 
               OR word LIKE '%onclick%'
        """)
        deleted_cache = cursor.rowcount
        print(f"  - Deleted {deleted_cache} malicious cache entries.")
        
        # 2. Delete Remaining Suspicious Users
        # Specifically targeting ID 29 and domain @bwmyga.com
        ids_to_purge = [29]
        # Find any other @bwmyga.com users
        cursor.execute("SELECT id FROM users WHERE email LIKE '%@bwmyga.com'")
        extra_ids = [r['id'] for r in cursor.fetchall() if r['id'] not in ids_to_purge]
        ids_to_purge.extend(extra_ids)
        
        if ids_to_purge:
            print(f"Removing suspicious users: {ids_to_purge}...")
            # Cascade delete
            id_list = ",".join(map(str, ids_to_purge))
            
            # Order matters due to FKs
            # 1. student_scores references assignments and student_id
            # 2. enrollments references classes and student_id
            # 3. saved_vocabulary references user_id
            # 4. assignments references classes and teacher_id
            # 5. classes references teacher_id (migration)
            
            print("Purging dependent records...")
            cursor.execute(f"DELETE FROM student_scores WHERE student_id IN ({id_list})")
            cursor.execute(f"DELETE FROM enrollments WHERE student_id IN ({id_list})")
            cursor.execute(f"DELETE FROM saved_vocabulary WHERE user_id IN ({id_list})")
            
            # For teacher-related records:
            # We must delete assignments first, as they reference classes and teachers
            cursor.execute(f"DELETE FROM assignments WHERE teacher_id IN ({id_list})")
            cursor.execute(f"DELETE FROM classes WHERE teacher_id IN ({id_list})")
            
            # Finally the users
            cursor.execute(f"DELETE FROM users WHERE id IN ({id_list})")
            print(f"  - Successfully purged {len(ids_to_purge)} suspicious accounts and their data.")
        
        conn.commit()
        
        # Sync if using Turso sync
        if hasattr(conn, 'sync'):
            conn.sync()
            print("Turso sync completed.")
            
        print("--- CLEANUP SUCCESSFUL ---")
        
    except Exception as e:
        print(f"FIX FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    run_fix()

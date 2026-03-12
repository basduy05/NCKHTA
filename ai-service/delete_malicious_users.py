from app.database import get_db
from dotenv import load_dotenv
import os

load_dotenv()

def delete_malicious_users():
    ids_to_delete = [22, 23, 26, 27, 28]
    print(f"Cleaning up malicious users and their dependent data: {ids_to_delete}...")
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 1. Delete from student_scores
        cursor.execute("DELETE FROM student_scores WHERE student_id IN ({})".format(','.join(map(str, ids_to_delete))))
        print("Deleted from student_scores.")
        
        # 2. Delete from enrollments
        cursor.execute("DELETE FROM enrollments WHERE student_id IN ({})".format(','.join(map(str, ids_to_delete))))
        print("Deleted from enrollments.")
        
        # 3. Delete from saved_vocabulary
        cursor.execute("DELETE FROM saved_vocabulary WHERE user_id IN ({})".format(','.join(map(str, ids_to_delete))))
        print("Deleted from saved_vocabulary.")
        
        # 4. For teachers (ID 26 is TEACHER), check if they have classes or assignments
        cursor.execute("DELETE FROM assignments WHERE teacher_id IN ({})".format(','.join(map(str, ids_to_delete))))
        print("Deleted assignments created by these users.")
        
        # 5. Delete the users
        cursor.execute("DELETE FROM users WHERE id IN ({})".format(','.join(map(str, ids_to_delete))))
        conn.commit()
        
        # Sync if using experimental
        if hasattr(conn, 'sync'):
            conn.sync()
            print("Turso sync completed.")

        print("Cleanup successful.")
        
    except Exception as e:
        print(f"Cleanup error: {e}")
        import traceback
        traceback.print_exc()
    
    # Verify
    cursor.execute("SELECT id, name FROM users WHERE id IN ({})".format(','.join(map(str, ids_to_delete))))
    remaining = cursor.fetchall()
    if not remaining:
        print("Verification: Malicious users are GONE.")
    else:
        print(f"FAILED: {len(remaining)} users still remain.")
    
    conn.close()

if __name__ == "__main__":
    delete_malicious_users()

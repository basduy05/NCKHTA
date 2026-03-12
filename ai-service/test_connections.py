import os
import sys
from dotenv import load_dotenv

# Add parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db, init_db
from app.services.graph_service import get_graph, _safe_query

def test_turso():
    print("\n--- Testing Turso Connection ---")
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        print(f"Turso Connection result: {result}")
        
        cursor.execute("SELECT count(*) as count FROM users")
        user_count = cursor.fetchone()
        print(f"User count: {user_count['count'] if user_count else 'N/A'}")
        
        print("Turso Connection: OK")
        return True
    except Exception as e:
        print(f"Turso Connection: FAILED")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_neo4j():
    print("\n--- Testing Neo4j Connection ---")
    try:
        g = get_graph()
        if not g:
            print("Neo4j Connection: FAILED (get_graph returned None)")
            return False
            
        result = _safe_query("MATCH (n) RETURN count(n) as count")
        print(f"Neo4j node count: {result}")
        print("Neo4j Connection: OK")
        return True
    except Exception as e:
        print(f"Neo4j Connection: FAILED")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    load_dotenv()
    turso_ok = test_turso()
    neo4j_ok = test_neo4j()
    
    print("\n--- Summary ---")
    print(f"Turso: {'OK' if turso_ok else 'FAILED'}")
    print(f"Neo4j: {'OK' if neo4j_ok else 'FAILED'}")
    
    if not turso_ok or not neo4j_ok:
        sys.exit(1)
    sys.exit(0)

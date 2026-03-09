import os
import sys

# Add parent dir to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services import graph_service

try:
    g = graph_service.get_graph()
    if g:
        print("Successfully connected to Neo4j via app logic!")
        try:
            res = g.query("RETURN 1 AS num")
            print("Query Executed:", res)
        except Exception as e:
            print("Query Error:", getattr(e, 'message', str(e)))
    else:
        print("Failed to connect via app logic. Last error:", graph_service.last_error)
except Exception as e:
    print("Exception running app logic:", e)

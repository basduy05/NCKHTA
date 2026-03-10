import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.graph_service import get_dictionary_cache, set_dictionary_cache, get_driver

print("Checking Neo4j dictionary_cache for 'student'...")
try:
    # First get it
    data = get_dictionary_cache("student")
    if data:
        print("Found in Neo4j!")
        if "error" in data or not data.get("meanings"):
            print("Contains error or no meanings. Deleting...")
            
            # Neo4j delete query since set_dictionary_cache doesn't easily delete
            driver = get_driver()
            with driver.session() as session:
                session.run("MATCH (w:Word {word: $word}) REMOVE w.dictionary_cache", word="student")
            print("Deleted Neo4j cache for 'student'.")
    else:
        print("Not found in Neo4j cache.")
except Exception as e:
    print(f"Neo4j Error: {e}")

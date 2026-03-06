try:
    from langchain_neo4j import Neo4jGraph
except ImportError:
    from langchain_community.graphs import Neo4jGraph

from typing import List, Dict
import os
import sqlite3
from dotenv import load_dotenv

load_dotenv()

# Read settings from DB first, then env vars
def _get_setting(key, default=None):
    try:
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        if row and row[0]:
            return row[0]
    except Exception:
        pass
    return os.getenv(key, default)

graph = None
last_error = None

def get_graph():
    global graph, last_error
    if graph is not None:
        return graph
    try:
        uri = _get_setting("NEO4J_URI")
        username = _get_setting("NEO4J_USERNAME")
        password = _get_setting("NEO4J_PASSWORD")
        db_name = _get_setting("NEO4J_DATABASE", username)

        if not uri or not username or not password:
            last_error = "Neo4j credentials not configured. Set them in Admin > Settings or environment variables."
            print(f"Warning: {last_error}")
            return None

        print(f"Trying to connect to Neo4j at {uri} (db={db_name})...")
        graph = Neo4jGraph(
            url=uri,
            username=username,
            password=password,
            database=db_name
        )
        print("Successfully connected to Neo4j DB.")
        last_error = None
        return graph
    except Exception as e:
        last_error = str(e)
        print(f"Warning: Neo4j connection failed: {e}")
        return None

def reconnect_graph():
    """Force reconnection (e.g. after changing settings)."""
    global graph, last_error
    graph = None
    last_error = None
    return get_graph()

def extract_entities_and_relations(text: str) -> Dict[str, list]:
    g = get_graph()
    if not g:
        return {"status": "skipped", "message": "Graph DB not connected"}       
    topic_name = "User Learning Session"
    if "English" in text: topic_name = "English Grammar"
    cypher_query = """
    MERGE (t:Topic {name: $topic})
    MERGE (c:Content {text: $summary})
    MERGE (t)-[:CONTAINS]->(c)
    RETURN t, c
    """
    try:
        g.query(cypher_query, params={"topic": topic_name, "summary": text[:20]})
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_knowledge_subgraph(topic: str) -> Dict:
    g = get_graph()
    if not g:
        return {"nodes": [], "links": [], "message": "Graph DB not connected"}  
    try:
        query = "RETURN 1"
        g.query(query)
        return {"nodes": [], "links": []}
    except Exception as e:
        return {"nodes": [], "links": []}

def create_vocab_node(word_data: Dict):
    g = get_graph()
    if not g:
        return {"status": "skipped", "message": "Graph DB not connected"}
        
    query = """
    MERGE (w:Word {text: $word})
    SET w.pronunciation = $pronunciation,
        w.meaning_vn = $meaning,
        w.level = $level,
        w.type = $type,
        w.example = $example
    RETURN w
    """
    try:
        g.query(query, params=word_data)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}



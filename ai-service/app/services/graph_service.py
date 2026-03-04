from langchain_community.graphs import Neo4jGraph
from typing import List, Dict
import os

NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+s://257692ed.databases.neo4j.io")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password_placeholder")

try:
    print("Trying to connect to Neo4j...")
    graph = Neo4jGraph(
        url=NEO4J_URI,
        username=NEO4J_USERNAME,
        password=NEO4J_PASSWORD,
        timeout=3
    )
    print("Successfully connected to Neo4j DB.")
except Exception as e:
    print(f"Warning: Neo4j connection failed or timed out: {e}")
    graph = None

def extract_entities_and_relations(text: str) -> Dict[str, list]:
    if not graph:
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
        graph.query(cypher_query, params={"topic": topic_name, "summary": text[:20]})
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_knowledge_subgraph(topic: str) -> Dict:
    if not graph:
        return {"nodes": [], "links": [], "message": "Graph DB not connected"}  
    try:
        query = "RETURN 1"
        graph.query(query)
        return {"nodes": [], "links": []}
    except Exception as e:
        return {"nodes": [], "links": []}

def create_vocab_node(word_data: Dict):
    if not graph:
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
        graph.query(query, params=word_data)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}



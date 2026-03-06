from langchain_neo4j import Neo4jGraph

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
        g.query(cypher_query, params={"topic": topic_name, "summary": text[:200]})
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def save_word_to_graph(word_data: Dict) -> Dict:
    """Save a word and its relationships to Neo4j knowledge graph."""
    g = get_graph()
    if not g:
        return {"status": "skipped", "message": "Graph DB not connected"}

    word = word_data.get("word", "").lower().strip()
    if not word:
        return {"status": "error", "message": "No word provided"}

    query = """
    MERGE (w:Word {text: $word})
    SET w.phonetic = $phonetic,
        w.pos = $pos,
        w.meaning_vn = $meaning_vn,
        w.meaning_en = $meaning_en,
        w.example = $example,
        w.level = $level,
        w.updated_at = datetime()

    WITH w
    MERGE (lvl:Level {name: $level})
    MERGE (w)-[:HAS_LEVEL]->(lvl)

    WITH w
    FOREACH (syn IN $synonyms |
        MERGE (s:Word {text: syn})
        MERGE (w)-[:SYNONYM]->(s)
    )

    WITH w
    FOREACH (ant IN $antonyms |
        MERGE (a:Word {text: ant})
        MERGE (w)-[:ANTONYM]->(a)
    )

    RETURN w
    """
    try:
        synonyms = word_data.get("synonyms", [])
        antonyms = word_data.get("antonyms", [])
        if isinstance(synonyms, list) and len(synonyms) > 0 and isinstance(synonyms[0], list):
            synonyms = [s for sub in synonyms for s in sub]
        if isinstance(antonyms, list) and len(antonyms) > 0 and isinstance(antonyms[0], list):
            antonyms = [a for sub in antonyms for a in sub]

        g.query(query, params={
            "word": word,
            "phonetic": word_data.get("phonetic", word_data.get("phonetic_uk", "")),
            "pos": word_data.get("pos", ""),
            "meaning_vn": word_data.get("meaning_vn", word_data.get("definition_vn", "")),
            "meaning_en": word_data.get("meaning_en", word_data.get("definition_en", "")),
            "example": word_data.get("example", ""),
            "level": word_data.get("level", "B1"),
            "synonyms": [s.lower().strip() for s in synonyms[:5] if isinstance(s, str)],
            "antonyms": [a.lower().strip() for a in antonyms[:3] if isinstance(a, str)],
        })
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def get_knowledge_subgraph(topic: str = "all", limit: int = 100) -> Dict:
    """Get vocabulary knowledge graph for visualization."""
    g = get_graph()
    if not g:
        return {"nodes": [], "links": [], "message": "Graph DB not connected"}
    try:
        if topic and topic != "all":
            query = """
            MATCH (w:Word)
            WHERE toLower(w.text) CONTAINS toLower($topic)
               OR toLower(w.meaning_vn) CONTAINS toLower($topic)
            WITH w LIMIT $limit
            OPTIONAL MATCH (w)-[r]-(related)
            RETURN w, type(r) as rel_type, related, labels(related) as related_labels
            """
            results = g.query(query, params={"topic": topic, "limit": limit})
        else:
            query = """
            MATCH (w:Word)
            WITH w ORDER BY w.updated_at DESC LIMIT $limit
            OPTIONAL MATCH (w)-[r]-(related)
            RETURN w, type(r) as rel_type, related, labels(related) as related_labels
            """
            results = g.query(query, params={"limit": limit})

        nodes = {}
        links = []
        for record in results:
            w = record.get("w")
            if w:
                wid = w.get("text", "")
                if wid and wid not in nodes:
                    nodes[wid] = {
                        "id": wid,
                        "label": wid,
                        "type": "Word",
                        "level": w.get("level", ""),
                        "meaning_vn": w.get("meaning_vn", ""),
                        "pos": w.get("pos", ""),
                    }
            related = record.get("related")
            rel_type = record.get("rel_type", "RELATED")
            related_labels = record.get("related_labels", [])
            if related and w:
                rid = related.get("text") or related.get("name") or ""
                if rid:
                    rtype = related_labels[0] if related_labels else "Word"
                    if rid not in nodes:
                        nodes[rid] = {
                            "id": rid,
                            "label": rid,
                            "type": rtype,
                            "level": related.get("level", ""),
                            "meaning_vn": related.get("meaning_vn", ""),
                        }
                    links.append({
                        "source": w.get("text", ""),
                        "target": rid,
                        "type": rel_type,
                    })

        return {"nodes": list(nodes.values()), "links": links}
    except Exception as e:
        print(f"get_knowledge_subgraph error: {e}")
        return {"nodes": [], "links": [], "error": str(e)}


def get_word_connections(word: str) -> Dict:
    """Get all connections for a specific word."""
    g = get_graph()
    if not g:
        return {"word": word, "connections": [], "message": "Graph DB not connected"}
    try:
        query = """
        MATCH (w:Word {text: $word})-[r]-(related)
        RETURN type(r) as relation, related.text as related_word,
               related.meaning_vn as meaning, labels(related) as labels
        """
        results = g.query(query, params={"word": word.lower().strip()})
        connections = []
        for record in results:
            connections.append({
                "relation": record.get("relation", ""),
                "word": record.get("related_word", ""),
                "meaning": record.get("meaning", ""),
                "type": record.get("labels", [""])[0] if record.get("labels") else "",
            })
        return {"word": word, "connections": connections}
    except Exception as e:
        return {"word": word, "connections": [], "error": str(e)}


def create_vocab_node(word_data: Dict):
    """Legacy function - delegates to save_word_to_graph."""
    return save_word_to_graph(word_data)



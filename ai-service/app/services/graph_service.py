from langchain_neo4j import Neo4jGraph

from typing import List, Dict
import os
import sqlite3
import time
from dotenv import load_dotenv

load_dotenv()

from ..database import get_setting

# Read settings from DB (via database.py handles Turso/SQLite) first, then env vars
def _get_setting(key, default=None):
    return get_setting(key, default)

graph = None
last_error = None
_last_connect_attempt = 0
_RECONNECT_COOLDOWN = 10  # seconds between reconnect attempts

def get_graph():
    global graph, last_error, _last_connect_attempt
    if graph is not None:
        return graph

    # Cooldown: don't spam reconnect attempts
    now = time.time()
    if now - _last_connect_attempt < _RECONNECT_COOLDOWN:
        return None
    _last_connect_attempt = now

    try:
        uri = _get_setting("NEO4J_URI")
        username = _get_setting("NEO4J_USERNAME")
        password = _get_setting("NEO4J_PASSWORD")
        db_name = _get_setting("NEO4J_DATABASE", username)

        if not uri or not username or not password:
            last_error = "Neo4j credentials not configured. Set them in Admin > Settings or .env file."
            print(f"[Neo4j ERROR] {last_error}", flush=True)
            return None

        print(f"[Neo4j] Connecting to {uri} (db={db_name})...", flush=True)
        graph = Neo4jGraph(
            url=uri,
            username=username,
            password=password,
            database=db_name
        )
        print("[Neo4j] Connected successfully.", flush=True)
        last_error = None
        return graph
    except Exception as e:
        last_error = str(e)
        print(f"[Neo4j ERROR] Connection failed: {e}", flush=True)
        return None

def _safe_query(query: str, params: dict = None):
    """Execute a Cypher query with auto-reconnect on connection loss."""
    global graph
    g = get_graph()
    if not g:
        return None
    try:
        return g.query(query, params=params or {})
    except Exception as e:
        error_str = str(e).lower()
        # If it's a connection error, reset and retry once
        if any(k in error_str for k in ["connection", "refused", "timeout", "closed", "reset", "unavailable"]):
            print(f"[Neo4j] Connection lost, reconnecting... ({e})")
            graph = None
            g = get_graph()
            if g:
                return g.query(query, params=params or {})
        raise

def reconnect_graph():
    """Force reconnection (e.g. after changing settings)."""
    global graph, last_error, _last_connect_attempt
    graph = None
    last_error = None
    _last_connect_attempt = 0  # Reset cooldown
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
        _safe_query(cypher_query, {"topic": topic_name, "summary": text[:200]})
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def find_word_in_graph(word: str) -> Dict:
    """Check if a word already exists in Neo4j and return its data."""
    g = get_graph()
    if not g:
        return None
    try:
        results = _safe_query("""
            MATCH (w:Word {text: $word})
            OPTIONAL MATCH (w)-[r]-(related)
            RETURN w, type(r) as rel_type, related.text as related_word,
                   labels(related) as related_labels
        """, {"word": word.lower().strip()})

        if not results:
            return None

        first = results[0]
        w = first.get("w")
        if not w or not w.get("text"):
            return None

        # Build full word data from graph
        word_data = {
            "word": w.get("text", ""),
            "phonetic_uk": w.get("phonetic", ""),
            "phonetic_us": w.get("phonetic", ""),
            "pos": w.get("pos", ""),
            "level": w.get("level", ""),
            "meanings": [{
                "pos": w.get("pos", ""),
                "definition_en": w.get("meaning_en", ""),
                "definition_vn": w.get("meaning_vn", ""),
                "examples": [w.get("example", "")] if w.get("example") else [],
                "synonyms": [],
                "antonyms": [],
            }],
            "word_family": [],
            "collocations": [],
            "sources": ["Neo4j Knowledge Graph"],
            "_from_graph": True,
        }

        # Collect relationships
        for record in results:
            rel = record.get("rel_type", "")
            related = record.get("related_word", "")
            if not related:
                continue
            if rel == "SYNONYM":
                word_data["meanings"][0]["synonyms"].append(related)
            elif rel == "ANTONYM":
                word_data["meanings"][0]["antonyms"].append(related)

        return word_data
    except Exception as e:
        print(f"find_word_in_graph error: {e}")
        return None


def get_dictionary_cache(word: str) -> Dict:
    """Retrieve full cached dictionary JSON from Neo4j."""
    g = get_graph()
    if not g:
        return None
    try:
        results = _safe_query("MATCH (w:Word {text: $word}) RETURN w.data_json as data_json", {"word": word.lower().strip()})
        if results and results[0].get("data_json"):
            import json
            return json.loads(results[0]["data_json"])
    except Exception as e:
        print(f"Neo4j get_dictionary_cache error: {e}")
    return None


def set_dictionary_cache(word: str, data: dict):
    """Save full dictionary JSON string to Neo4j to survive SQLite ephemeral restarts."""
    g = get_graph()
    if not g:
        return
    try:
        import json
        query = "MERGE (w:Word {text: $word}) SET w.data_json = $data_json, w.updated_at = datetime()"
        _safe_query(query, {
            "word": word.lower().strip(),
            "data_json": json.dumps(data, ensure_ascii=False)
        })
    except Exception as e:
        print(f"Neo4j set_dictionary_cache error: {e}")


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
        w.audio_url = $audio_url,
        w.pos = $pos,
        w.meaning_vn = $meaning_vn,
        w.meaning_en = $meaning_en,
        w.example = $example,
        w.level = $level,
        w.word_family = $word_family,
        w.collocations = $collocations,
        w.idioms = $idioms,
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

        word_family = word_data.get("word_family", [])
        collocations = word_data.get("collocations", [])
        idioms_raw = word_data.get("idioms", [])
        
        # Format idioms array into a list of strings if they are objects
        idioms_list = []
        for i in idioms_raw:
            if isinstance(i, dict):
                idioms_list.append(f"{i.get('idiom', '')}: {i.get('meaning_vn', '')}")
            else:
                idioms_list.append(str(i))

        _safe_query(query, {
            "word": word,
            "phonetic": word_data.get("phonetic", word_data.get("phonetic_uk", "")),
            "audio_url": word_data.get("audio_url", ""),
            "pos": word_data.get("pos", ""),
            "meaning_vn": word_data.get("meaning_vn", word_data.get("definition_vn", "")),
            "meaning_en": word_data.get("meaning_en", word_data.get("definition_en", "")),
            "example": word_data.get("example", ""),
            "level": word_data.get("level", "B1"),
            "word_family": word_family if isinstance(word_family, list) else [],
            "collocations": collocations if isinstance(collocations, list) else [],
            "idioms": idioms_list,
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
            results = _safe_query(query, {"topic": topic, "limit": limit})
        else:
            query = """
            MATCH (w:Word)
            WITH w ORDER BY w.updated_at DESC LIMIT $limit
            OPTIONAL MATCH (w)-[r]-(related)
            RETURN w, type(r) as rel_type, related, labels(related) as related_labels
            """
            results = _safe_query(query, {"limit": limit})

        if not results:
            return {"nodes": [], "links": []}

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
        # Try exact match first
        word_lower = word.lower().strip()
        query = """
        MATCH (w:Word {text: $word})-[r]-(related:Word)
        RETURN type(r) as relation, related.text as related_word,
               related.meaning_vn as meaning, labels(related) as labels
        LIMIT 20
        """
        results = _safe_query(query, {"word": word_lower})
        connections = []
        if results:
            for record in results:
                connections.append({
                    "relation": record.get("relation", ""),
                    "word": record.get("related_word", ""),
                    "meaning": record.get("meaning", ""),
                    "type": record.get("labels", [""])[0] if record.get("labels") else "",
                })
        
        # If no connections found, try case-insensitive search
        if not connections:
            query = """
            MATCH (w:Word)
            WHERE toLower(w.text) = $word_lower
            MATCH (w)-[r]-(related:Word)
            RETURN type(r) as relation, related.text as related_word,
                   related.meaning_vn as meaning, labels(related) as labels
            LIMIT 20
            """
            results = _safe_query(query, {"word_lower": word_lower})
            if results:
                for record in results:
                    connections.append({
                        "relation": record.get("relation", ""),
                        "word": record.get("related_word", ""),
                        "meaning": record.get("meaning", ""),
                        "type": record.get("labels", [""])[0] if record.get("labels") else "",
                    })
        
        # If still no connections, search for related words containing the term
        if not connections:
            query = """
            MATCH (w:Word)
            WHERE toLower(w.text) CONTAINS $word_lower
            MATCH (w)-[r]-(related:Word)
            RETURN type(r) as relation, w.text as word, w.meaning_vn as word_meaning,
                   related.text as related_word, related.meaning_vn as meaning
            LIMIT 20
            """
            results = _safe_query(query, {"word_lower": word_lower})
            if results:
                for record in results:
                    connections.append({
                        "relation": record.get("relation", ""),
                        "word": record.get("related_word", record.get("word", "")),
                        "meaning": record.get("meaning", record.get("word_meaning", "")),
                        "type": "Word",
                    })
        
        return {"word": word, "connections": connections}
    except Exception as e:
        return {"word": word, "connections": [], "error": str(e)}


def create_vocab_node(word_data: Dict):
    """Legacy function - delegates to save_word_to_graph."""
    return save_word_to_graph(word_data)



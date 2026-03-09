import os
from langchain_neo4j import Neo4jGraph
from dotenv import load_dotenv

load_dotenv()

URI = os.getenv("NEO4J_URI")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

print("Testing with database='neo4j'")
try:
    g1 = Neo4jGraph(url=URI, username=USERNAME, password=PASSWORD, database="neo4j")
    print("Success with 'neo4j'")
except Exception as e:
    print("Failed with 'neo4j':", e)

print("---------------------------------")
print(f"Testing with database='{USERNAME}'")
try:
    g2 = Neo4jGraph(url=URI, username=USERNAME, password=PASSWORD, database=USERNAME)
    print(f"Success with '{USERNAME}'")
except Exception as e:
    print(f"Failed with '{USERNAME}':", e)

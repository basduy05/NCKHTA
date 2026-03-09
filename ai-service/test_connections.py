#!/usr/bin/env python3
"""
Diagnostic script to test database and Neo4j connections.
Run this to diagnose connection issues.
"""
import os
import sys

# Add the app directory to path
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 60)
print("DIAGNOSTIC: Database & Neo4j Connection Test")
print("=" * 60)

# Test 1: Check if .env file exists and can be loaded
print("\n[1] Checking .env file loading...")
from dotenv import load_dotenv

# Try loading from different paths
env_paths = [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "ai-service", ".env"),
    ".env",
]

loaded = False
for env_path in env_paths:
    if os.path.exists(env_path):
        print(f"   Found .env at: {env_path}")
        load_dotenv(env_path)
        loaded = True
        break

if not loaded:
    print("   WARNING: No .env file found!")

# Test 2: Check environment variables
print("\n[2] Checking environment variables...")
env_checks = [
    ("TURSO_URL", "Turso URL"),
    ("TURSO_AUTH_TOKEN", "Turso Auth Token"),
    ("NEO4J_URI", "Neo4j URI"),
    ("NEO4J_USERNAME", "Neo4j Username"),
    ("NEO4J_PASSWORD", "Neo4j Password"),
    ("DATABASE_PATH", "Database Path"),
]

for var_name, desc in env_checks:
    value = os.getenv(var_name)
    if value:
        # Show partial value for security
        if "PASSWORD" in var_name or "TOKEN" in var_name or "SECRET" in var_name:
            show_val = value[:10] + "..." if len(value) > 10 else "***"
        else:
            show_val = value
        print(f"   {var_name}: {show_val}")
    else:
        print(f"   {var_name}: NOT SET!")

# Test 3: Try to connect to Turso/SQLite
print("\n[3] Testing database connection...")
try:
    from app.database import get_db, TURSO_URL, TURSO_AUTH_TOKEN
    
    print(f"   TURSO_URL configured: {bool(TURSO_URL)}")
    print(f"   TURSO_AUTH_TOKEN configured: {bool(TURSO_AUTH_TOKEN)}")
    
    print("   Attempting database connection...")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print(f"   SUCCESS! Found {len(tables)} tables:")
    for table in tables:
        print(f"      - {table[0]}")
    conn.close()
except Exception as e:
    print(f"   ERROR: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Try to connect to Neo4j
print("\n[4] Testing Neo4j connection...")
try:
    from app.services import graph_service
    
    print("   Attempting Neo4j connection...")
    graph = graph_service.get_graph()
    if graph:
        print("   SUCCESS! Neo4j connected!")
        # Try a simple query
        result = graph.query("RETURN 1 as test")
        print(f"   Test query result: {result}")
    else:
        print(f"   ERROR: Could not connect to Neo4j")
        print(f"   Last error: {graph_service.last_error}")
except Exception as e:
    print(f"   ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)

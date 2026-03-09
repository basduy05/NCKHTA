#!/usr/bin/env python3
"""Test Turso connection"""
import sys
print("Starting test...", flush=True)

try:
    import libsql
    print(f"libsql imported: {libsql}", flush=True)
except Exception as e:
    print(f"Failed to import libsql: {e}", flush=True)
    sys.exit(1)

TURSO_URL = "libsql://nckhta-basduy05.aws-ap-northeast-1.turso.io"
TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzMwMjYxMjYsImlkIjoiMDE5Y2QwOTUtMDEwMS03NzM2LWEyODEtMTczNTA3NTc3ZmUxIiwicmlkIjoiMTQwNTcxYzgtNTUzYS00NjE4LWI4MzYtOTA4MzMzZWQwMWM2In0.pcBDvE0YKELXezQrZK3T_ulxTSOaq5-m7yfhgsJ3XJtK8dxLpr6MHk3jhm0QdhSPg2YG7Yf0DAU1RpoT_PBIBA"

# Convert libsql:// to https://
url_to_use = TURSO_URL.replace("libsql://", "https://")
print(f"Connecting to: {url_to_use}", flush=True)

try:
    conn = libsql.connect(url_to_use, auth_token=TURSO_AUTH_TOKEN)
    print("Connected, executing query...", flush=True)
    cursor = conn.execute("SELECT 1")
    result = cursor.fetchone()
    print(f"Result: {result}", flush=True)
    print("SUCCESS!", flush=True)
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}", flush=True)
    import traceback
    traceback.print_exc()

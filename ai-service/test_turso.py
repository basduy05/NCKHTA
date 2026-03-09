import libsql_experimental as sqlite3
import os

url = "libsql://nckhta-basduy05.aws-ap-northeast-1.turso.io"
auth_token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzMwMjYxMjYsImlkIjoiMDE5Y2QwOTUtMDEwMS03NzM2LWEyODEtMTczNTA3NTc3ZmUxIiwicmlkIjoiMTQwNTcxYzgtNTUzYS00NjE4LWI4MzYtOTA4MzMzZWQwMWM2In0.pcBDvE0YKELXezQrZK3T_ulxTSOaq5-m7yfhgsJ3XJtK8dxLpr6MHk3jhm0QdhSPg2YG7Yf0DAU1RpoT_PBIBA"

try:
    conn = sqlite3.connect("nckhta", sync_url=url, auth_token=auth_token)
    conn.sync()
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    print("SUCCESS WITH SYNC_URL:", cursor.fetchone())
except Exception as e:
    print("Failed with sync_url:", e)
    try:
        conn = sqlite3.connect(f"{url}?authToken={auth_token}")
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        print("SUCCESS WITH DIRECT URL:", cursor.fetchone())
    except Exception as e2:
        print("Failed with direct url:", e2)


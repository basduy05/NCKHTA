
import sqlite3
import json
import asyncio
import httpx

DB_PATH = r"c:\Users\basdu\Downloads\NCKHTA\ai-service\local.db" # Adjusted for likely location based on context

def check_db_schema():
    print("Checking database schema...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]
    if "credits_ai" in columns:
        print("SUCCESS: 'credits_ai' column exists in 'users' table.")
    else:
        print("FAILURE: 'credits_ai' column MISSING in 'users' table.")
    conn.close()

async def test_streaming_endpoint(url, payload, token):
    print(f"Testing streaming at {url}...")
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", url, json=payload, headers=headers, timeout=60.0) as response:
            if response.status_code != 200:
                print(f"FAILURE: Received status {response.status_code}")
                return
            
            chunk_count = 0
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    chunk_count += 1
                    data = line[6:]
                    if data == "[DONE]":
                        print("Stream finished with [DONE]")
                    else:
                        try:
                            json_chunk = json.loads(data)
                            # print(f"Chunk received: {json_chunk.get('status', 'unknown')}")
                        except:
                            pass
            print(f"Total chunks received: {chunk_count}")

async def main():
    check_db_schema()
    # Note: Testing endpoints requires a valid token and a running server.
    # Since I cannot easily run the server and get a token in this test,
    # I'll focus on confirming the DB state and code correctness.
    print("Verification script ready. Further manual testing recommended for full streaming flow.")

if __name__ == "__main__":
    asyncio.run(main())

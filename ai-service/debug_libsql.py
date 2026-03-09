import libsql
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("TURSO_URL")
token = os.getenv("TURSO_AUTH_TOKEN")

print(f"URL: {url}")
print(f"Token length: {len(token) if token else 0}")

try:
    print("Attempting connection with auth_token...")
    conn = libsql.connect(url, auth_token=token)
    print("Success!")
    conn.close()
except TypeError as e:
    print(f"Failed with auth_token: {e}")
    try:
        print("Attempting connection with token-based URL...")
        # Some versions might want the token in the URL or via a different name
        conn = libsql.connect(f"{url}?authToken={token}")
        print("Success with token in URL!")
        conn.close()
    except Exception as e2:
        print(f"Failed again: {e2}")
except Exception as e:
    print(f"General error: {e}")

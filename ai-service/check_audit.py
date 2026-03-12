from app.database import get_db
from dotenv import load_dotenv
import os

# Load env vars
load_dotenv()

def audit_users():
    print(f"Connecting to: {os.getenv('TURSO_URL')}")
    print("Security Audit: Checking for XSS payloads in 'users' table...")
    conn = get_db()
    cursor = conn.cursor()
    
    # List ALL users to be 100% sure
    cursor.execute("SELECT id, name, email, phone FROM users")
    rows = cursor.fetchall()
    
    print(f"Total users in DB: {len(rows)}")
    
    malicious = []
    for r in rows:
        name = str(r['name'])
        phone = str(r['phone'] or "")
        if '<' in name or 'script' in name.lower() or 'onerror' in name.lower() or '<' in phone:
            malicious.append(r)
    
    if not malicious:
        print("No obviously malicious users found in the current results.")
        # If total users is small, print them all to see what's happening
        if len(rows) < 30:
            for r in rows:
                print(f"ID: {r['id']} | Email: {r['email']} | Name: {r['name']}")
    else:
        print(f"Found {len(malicious)} potentially malicious users:")
        for r in malicious:
            print(f"ID: {r['id']} | Email: {r['email']} | Name: {r['name']}")
    
    conn.close()

if __name__ == "__main__":
    audit_users()

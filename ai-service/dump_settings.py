from app.database import get_db
try:
    with get_db() as conn:
        cursor = conn.execute("SELECT key, value FROM settings")
        rows = cursor.fetchall()
        print("--- DB SETTINGS ---")
        for row in rows:
            val = row['value']
            # Mask sensitive info
            if any(k in row['key'].upper() for k in ['KEY', 'PASSWORD', 'TOKEN']):
                val = val[:5] + "..." if val else "None"
            print(f"{row['key']}: {val}")
except Exception as e:
    print(f"Error reading settings: {e}")

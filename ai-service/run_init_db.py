from app.database import init_db
import os

if __name__ == "__main__":
    # Ensure we are in the right directory so app.db is found/created correctly
    init_db()
    print("Database initialization complete.")

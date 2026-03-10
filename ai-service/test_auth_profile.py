
import os
import sys
import json
from jose import jwt

# Add the app directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services import auth_service
from app.database import get_db, init_db

def test_token_verification():
    print("Testing token verification and profile access...")
    
    # 1. Generate a test token
    user_id = 999
    email = "test@example.com"
    # Ensure SECRET_KEY is set for testing
    if not os.getenv("SECRET_KEY"):
        os.environ["SECRET_KEY"] = "test_secret_key_for_unit_tests"
        auth_service.SECRET_KEY = "test_secret_key_for_unit_tests"
    
    token = auth_service.generate_access_token(user_id, email)
    print(f"Generated token for user_id={user_id}")
    
    # 2. Verify token using the service (this returns user_id and email)
    payload = auth_service.verify_access_token(token)
    print(f"Verified payload: {payload}")
    
    if payload and payload.get("user_id") == user_id:
        print("SUCCESS: auth_service.verify_access_token correctly returns 'user_id'")
        
        # 3. Simulate the router logic that was failing
        try:
            # This is what used to be in auth.py: user_id = int(payload['sub'])
            # The current fix uses user_id = payload['user_id']
            extracted_id = payload['user_id']
            print(f"Extracted user_id from payload: {extracted_id}")
            if extracted_id == user_id:
                print("SUCCESS: Profile extraction logic is now correct.")
            else:
                print("FAILED: Extracted ID does not match.")
        except KeyError as e:
            print(f"FAILED: KeyError accessing {e}")
    else:
        print("FAILED: Token verification failed or returned wrong data.")

if __name__ == "__main__":
    test_token_verification()

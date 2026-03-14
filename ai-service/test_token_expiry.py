
import os
import sys
import json
from datetime import datetime, timedelta, timezone
from jose import jwt

# Add the app directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services import auth_service

def test_token_expiration():
    print("Testing token expiration duration...")
    
    # Ensure SECRET_KEY is set for testing
    if not os.getenv("SECRET_KEY"):
        os.environ["SECRET_KEY"] = "test_secret_key_for_unit_tests"
    
    auth_service.SECRET_KEY = os.environ["SECRET_KEY"]
    
    user_id = 1
    email = "admin@example.com"
    
    token = auth_service.generate_access_token(user_id, email)
    
    # Decode the token to check 'exp' claim
    payload = jwt.decode(token, auth_service.SECRET_KEY, algorithms=[auth_service.ALGORITHM])
    
    exp_timestamp = payload['exp']
    iat_timestamp = payload['iat']
    
    duration_seconds = exp_timestamp - iat_timestamp
    duration_minutes = duration_seconds / 60
    duration_days = duration_minutes / (60 * 24)
    
    print(f"Token 'iat': {datetime.fromtimestamp(iat_timestamp, tz=timezone.utc)}")
    print(f"Token 'exp': {datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)}")
    print(f"Duration: {duration_minutes} minutes ({duration_days} days)")
    
    expected_minutes = 60 * 24 * 30
    if abs(duration_minutes - expected_minutes) < 1:
        print(f"SUCCESS: Token duration is correct (30 days).")
    else:
        print(f"FAILED: Token duration is {duration_minutes} minutes, expected {expected_minutes}.")

if __name__ == "__main__":
    test_token_expiration()

import requests
import json

def test_production():
    base_url = "https://iedu-ksk7.onrender.com"
    # Login
    print("Logging in...")
    login_res = requests.post(f"{base_url}/auth/login", json={"email": "admin@eam.edu.vn", "password": "password"})
    if login_res.status_code != 200:
        # Try default password
        login_res = requests.post(f"{base_url}/auth/login", json={"email": "admin@eam.edu.vn", "password": "123456"})
        if login_res.status_code != 200:
            print("Login failed:", login_res.text)
            return

    token = login_res.json().get("access_token")
    print("Logged in successfully. Token obtained.")

    headers = {"Authorization": f"Bearer {token}"}
    
    # Test dictionary (known working)
    print("\n[1] Testing dictionary...")
    dict_res = requests.post(f"{base_url}/student/dictionary/lookup", headers=headers, json={"word": "test"}, stream=True)
    print("Dictionary status:", dict_res.status_code)
    
    # Test reading practice
    print("\n[2] Testing Reading Practice...")
    read_res = requests.post(f"{base_url}/student/practice/generate", headers=headers, json={"test_type": "TOEIC", "skill": "reading"}, stream=True)
    print("Reading status:", read_res.status_code)
    try:
        for line in read_res.iter_lines():
            if line:
                print("READING STREAM:", line.decode("utf-8"))
    except Exception as e:
        print("Reading stream error:", e)

if __name__ == "__main__":
    test_production()

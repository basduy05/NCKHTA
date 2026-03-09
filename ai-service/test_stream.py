import requests
import json

def test():
    # Login
    login_res = requests.post('http://127.0.0.1:8000/auth/login', json={'email': 'admin@eam.edu.vn', 'password': '123456'})
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
        
    token = login_res.json().get('access_token')
    print("Logged in, token:", token[:10] + "...")
    
    # Test dictionary stream
    headers = {'Authorization': f'Bearer {token}'}
    data = {'word': 'legendary'}
    
    print("\nStarting stream request...")
    with requests.post('http://127.0.0.1:8000/student/dictionary/lookup', headers=headers, json=data, stream=True) as r:
        if r.status_code != 200:
            print("Stream error:", r.text)
            return
            
        print("Status Code:", r.status_code)
        for line in r.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                print(decoded_line)
                
if __name__ == "__main__":
    test()

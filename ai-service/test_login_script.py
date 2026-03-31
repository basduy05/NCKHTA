import urllib.request, json
req = urllib.request.Request(
    'http://localhost:8000/auth/login',
    data=json.dumps({'email': 'admin@gmail.com', 'password': '123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} {e.reason}")
    print(e.read().decode())
except Exception as e:
    print(f"Error: {e}")

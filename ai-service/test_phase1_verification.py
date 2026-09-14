from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

print('--- Initializing Database & Running Migrations ---')
init_db()

with TestClient(app) as client:
    print('--- 1. Testing /health ---')
    r = client.get('/health')
    print('Status:', r.status_code)
    print('Payload:', r.json())
    assert r.status_code == 200
    assert r.json()['database_connected'] is True
    assert 'system_ram' in r.json()

    print('\n--- 2. Testing Rate Limiter (5 requests max) ---')
    rate_limited = False
    for i in range(7):
        resp = client.post('/auth/login', json={'email': 'nonexistent@example.com', 'password': 'wrong'}, headers={"X-Forwarded-For": "192.168.1.100"})
        if resp.status_code == 429:
            rate_limited = True
            print(f'Attempt {i+1} got 429 Too Many Requests: {resp.json().get("detail")}')
            break
    assert rate_limited, "Rate limiter should trigger HTTP 429"

    print('\n--- 3. Testing Valid Login with Token Blacklist ---')
    r = client.post('/auth/login', json={'email': 'huytran123@gmail.com', 'password': '123456'}, headers={"X-Forwarded-For": "10.0.0.1"})
    print('Login status:', r.status_code)
    token = r.json().get('access_token')
    assert token is not None
    headers = {'Authorization': f'Bearer {token}'}

    print('\n--- 4. Testing Search History ---')
    # Trigger a lookup
    r = client.post('/student/dictionary/lookup', json={'word': 'serendipity'}, headers=headers)
    print('Lookup status:', r.status_code)
    # Check history
    r = client.get('/student/dictionary/history', headers=headers)
    print('Search History status:', r.status_code, 'Words:', [w['word'] for w in r.json()])
    assert r.status_code == 200
    assert any(w['word'] == 'serendipity' for w in r.json())

    print('\n--- 5. Testing Leaderboard Filters ---')
    for period in ['all', 'week', 'month', 'class']:
        r = client.get(f'/student/leaderboard?period={period}', headers=headers)
        print(f'Leaderboard ({period}) status: {r.status_code}, Count: {len(r.json())}')
        assert r.status_code == 200

    print('\n--- 6. Testing Points History ---')
    r = client.get('/student/points/history', headers=headers)
    print('Points History status:', r.status_code, f'Count: {len(r.json())}')
    assert r.status_code == 200

    print('\n--- 7. Testing Placement Test ---')
    r = client.get('/student/placement-test', headers=headers)
    print('Placement Test questions status:', r.status_code, 'Questions count:', r.json().get('total_questions'))
    assert r.status_code == 200
    assert r.json().get('total_questions') == 15

    print('\n--- 8. Submitting Placement Test ---')
    submit_data = {'answers': {'1': 0, '2': 1, '3': 2, '4': 1, '5': 1, '6': 1, '7': 2, '8': 1, '9': 1, '10': 1, '11': 0, '12': 1, '13': 1, '14': 1, '15': 1}}
    r = client.post('/student/placement-test/submit', json=submit_data, headers=headers)
    print('Submit status:', r.status_code)
    res = r.json()
    print(f"Result Level: {res.get('cefr_level')}, Score: {res.get('score')}/15, Points awarded: {res.get('points_awarded')}")
    assert r.status_code == 200
    assert res.get('cefr_level') == 'C1'
    assert res.get('points_awarded') == 50

    print('\n--- 9. Verifying Points Logged After Placement Test ---')
    r = client.get('/student/points/history', headers=headers)
    recent_log = r.json()[0]
    print(f"Latest Point Log: [{recent_log['action']}] +{recent_log['points']} pts - {recent_log['details']}")
    assert recent_log['points'] == 50

    print('\n' + '='*60)
    print('🎉 ALL BACKEND PHASE 1 AUTOMATED TESTS PASSED 100%! 🎉')
    print('='*60)

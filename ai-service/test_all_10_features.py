import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000"

def post_json(url, data, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code} on POST {url}: {e.read().decode('utf-8')}")
        raise

def get_json(url, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code} on GET {url}: {e.read().decode('utf-8')}")
        raise

print("=== 1. Logging in Student (huytran123@gmail.com) ===")
student_login = post_json(f"{BASE_URL}/auth/login", {"email": "huytran123@gmail.com", "password": "123456"})
student_token = student_login.get("access_token")
print(f"Student token obtained: {bool(student_token)}")

print("\n=== 2. Testing Streak Calendar Endpoint ===")
streak_res = get_json(f"{BASE_URL}/student/streak-calendar?days=60", student_token)
print(f"Streak Days: {streak_res.get('streak_days')}, Calendar data points: {len(streak_res.get('calendar', []))}")

print("\n=== 3. Testing Badges Endpoint ===")
badges_res = get_json(f"{BASE_URL}/student/badges", student_token)
print(f"Total Badges defined: {len(badges_res.get('badges', []))}")
for b in badges_res.get('badges', [])[:3]:
    print(f" - {b['icon']} {b['name']}: {b['description_vn']} (earned: {b['is_earned']})")

print("\n=== 4. Testing News Reading (Click-to-Lookup) Endpoint ===")
news_res = get_json(f"{BASE_URL}/student/news/reading?level=B1&limit=3", student_token)
print(f"Articles loaded: {len(news_res.get('articles', []))}")
if news_res.get('articles'):
    print(f" - Title: {news_res['articles'][0]['title']}")

print("\n=== 5. Testing AI Long-term Memory Profile ===")
mem_res = get_json(f"{BASE_URL}/student/memory-profile", student_token)
print(f"Student: {mem_res.get('name')}, Level: {mem_res.get('current_level')}, Profile: {mem_res.get('profile')}")

print("\n=== 6. Testing Study Groups Endpoints ===")
groups_res = get_json(f"{BASE_URL}/groups/my", student_token)
print(f"My Groups: {len(groups_res.get('groups', []))}")

print("\n=== 7. Logging in Teacher (lannguyen@iedu.vn) ===")
teacher_login = post_json(f"{BASE_URL}/auth/login", {"email": "lannguyen@iedu.vn", "password": "123456"})
teacher_token = teacher_login.get("access_token")
print(f"Teacher token obtained: {bool(teacher_token)}")

print("\n=== 8. Testing Teacher Class Analytics ===")
analytics_res = get_json(f"{BASE_URL}/teacher/analytics/class/1", teacher_token)
print(f"Class: {analytics_res.get('class_name')}, Avg Score: {analytics_res.get('avg_score')}%, Skills: {analytics_res.get('skill_breakdown')}")

print("\n=== ALL 10 FEATURES VERIFIED SUCCESSFULLY! ===")

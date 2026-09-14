"""
Locust Load Testing Script for Production Scale (Task 3.16)
Simulates hundreds/thousands of concurrent users hitting the API to measure p95/p99 latency, RPS, and throughput.

Usage:
  locust -f load_test_locust.py --headless -u 100 -r 10 --run-time 1m --host http://localhost:8000
"""

from locust import HttpUser, task, between
import random
import json

SAMPLE_WORDS = ["ephemeral", "ubiquitous", "resilience", "serendipity", "lucid", "eloquent", "pragmatic", "meticulous"]

class ProductionStudentUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """Simulate student login."""
        self.headers = {"Content-Type": "application/json"}
        # Attempt login or use default test token
        res = self.client.post("/auth/login", json={
            "email": "student1@example.com",
            "password": "password123"
        })
        if res.status_code == 200:
            data = res.json()
            token = data.get("access_token")
            self.headers["Authorization"] = f"Bearer {token}"
        else:
            self.headers["Authorization"] = "Bearer test_token"

    @task(4)
    def lookup_dictionary(self):
        """High-frequency vocabulary lookup testing CMU IPA and cache performance."""
        word = random.choice(SAMPLE_WORDS)
        self.client.get(f"/student/dictionary/cmu-ipa?word={word}", headers=self.headers, name="/student/dictionary/cmu-ipa")

    @task(3)
    def view_dashboard_overview(self):
        """Dashboard overview and stats."""
        self.client.get("/student/stats", headers=self.headers, name="/student/stats")
        self.client.get("/student/daily-challenges", headers=self.headers, name="/student/daily-challenges")

    @task(2)
    def check_roadmap_eta(self):
        """Check ETA projection."""
        self.client.get("/student/roadmap/eta", headers=self.headers, name="/student/roadmap/eta")

    @task(1)
    def export_anki_vocab(self):
        """Test vocabulary deck export streaming."""
        self.client.get("/student/vocabulary/export?format=anki", headers=self.headers, name="/student/vocabulary/export")

    @task(1)
    def public_parent_report(self):
        """Simulate parent reading public report."""
        self.client.get("/student/public/report/DEMO1234", name="/student/public/report/{code}")

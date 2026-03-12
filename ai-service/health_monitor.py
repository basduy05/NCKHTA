#!/usr/bin/env python3
"""
Automated Health Monitoring Script for EAM System
Run this script periodically to check system health and database connectivity.

Usage:
- python health_monitor.py              # Basic health check
- python health_monitor.py --alert      # Send alerts on failures
- python health_monitor.py --cron       # Cron-friendly output (no colors)

Environment Variables Required:
- TURSO_URL
- TURSO_AUTH_TOKEN
- NEO4J_URI
- NEO4J_USERNAME
- NEO4J_PASSWORD
- GOOGLE_API_KEY (optional, for LLM health)
"""

import os
import sys
import time
import requests
from datetime import datetime
import argparse

# Add app directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Import database modules
try:
    from app.database import get_db
    from app.services.graph_service import get_graph
    DB_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import database modules: {e}")
    DB_AVAILABLE = False

class HealthMonitor:
    def __init__(self, alert_mode=False, cron_mode=False):
        self.alert_mode = alert_mode
        self.cron_mode = cron_mode
        self.results = {}
        self.errors = []

    def log(self, message, level="INFO"):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if self.cron_mode:
            print(f"[{timestamp}] {level}: {message}")
        else:
            # Add colors for terminal output
            colors = {
                "INFO": "\033[32m",  # Green
                "WARN": "\033[33m",  # Yellow
                "ERROR": "\033[31m",  # Red
                "RESET": "\033[0m"   # Reset
            }
            color = colors.get(level, colors["RESET"])
            print(f"{color}[{timestamp}] {level}: {message}{colors['RESET']}")

    def check_environment_variables(self):
        """Check required environment variables"""
        self.log("Checking environment variables...")
        required_vars = [
            "TURSO_URL",
            "TURSO_AUTH_TOKEN",
            "NEO4J_URI",
            "NEO4J_USERNAME",
            "NEO4J_PASSWORD"
        ]

        missing = []
        for var in required_vars:
            if not os.getenv(var):
                missing.append(var)

        if missing:
            self.errors.append(f"Missing environment variables: {', '.join(missing)}")
            self.results["env_vars"] = False
        else:
            self.results["env_vars"] = True

        # Optional vars
        optional_vars = ["GOOGLE_API_KEY", "COHERE_API_KEY"]
        for var in optional_vars:
            if os.getenv(var):
                self.log(f"OK: {var} configured")
            else:
                self.log(f"WARNING: {var} not configured (optional)")

    def check_database_connectivity(self):
        """Check database connections"""
        self.log("Checking database connectivity...")

        if not DB_AVAILABLE:
            self.errors.append("Database modules not available")
            self.results["database"] = False
            return

        # Check Turso connection
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result:
                self.results["turso_db"] = True
                self.log("OK: Turso database connection OK")
            else:
                self.results["turso_db"] = False
                self.errors.append("Turso database test query failed")
        except Exception as e:
            self.results["turso_db"] = False
            self.errors.append(f"Turso database error: {e}")

        # Check Neo4j connection
        try:
            graph = get_graph()
            # Simple test query
            result = graph.query("RETURN 1 as test")
            if result and result[0]["test"] == 1:
                self.results["neo4j_db"] = True
                self.log("OK: Neo4j database connection OK")
            else:
                self.results["neo4j_db"] = False
                self.errors.append("Neo4j database test query failed")
        except Exception as e:
            self.results["neo4j_db"] = False
            self.errors.append(f"Neo4j database error: {e}")

        self.results["database"] = self.results.get("turso_db", False) and self.results.get("neo4j_db", False)

    def check_api_endpoints(self):
        """Check critical API endpoints"""
        self.log("Checking API endpoints...")

        base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        endpoints = [
            "/health",
            "/docs",  # FastAPI docs
        ]

        api_ok = True
        for endpoint in endpoints:
            try:
                response = requests.get(f"{base_url}{endpoint}", timeout=10)
                if response.status_code == 200:
                    self.log(f"OK: {endpoint} OK ({response.status_code})")
                else:
                    self.log(f"WARNING: {endpoint} returned {response.status_code}")
                    api_ok = False
            except Exception as e:
                self.errors.append(f"API endpoint {endpoint} failed: {e}")
                api_ok = False

        self.results["api_endpoints"] = api_ok

    def check_llm_services(self):
        """Check LLM service availability (basic ping)"""
        self.log("Checking LLM services...")

        if not os.getenv("GOOGLE_API_KEY"):
            self.log("⚠ Google API key not configured, skipping LLM check")
            self.results["llm_services"] = None
            return

        try:
            import google.generativeai as genai
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
            # Simple model list check
            models = genai.list_models()
            if models:
                self.results["llm_services"] = True
                self.log("OK: Google Gemini API accessible")
            else:
                self.results["llm_services"] = False
                self.errors.append("Google Gemini API returned no models")
        except Exception as e:
            self.results["llm_services"] = False
            self.errors.append(f"Google Gemini API error: {e}")

    def run_all_checks(self):
        """Run all health checks"""
        self.log("Starting EAM System Health Check")
        self.log("=" * 50)

        self.check_environment_variables()
        self.check_database_connectivity()
        self.check_api_endpoints()
        self.check_llm_services()

        self.log("=" * 50)
        self.summarize_results()

    def summarize_results(self):
        """Summarize check results"""
        total_checks = len([k for k in self.results.keys() if k != "database"])  # Don't double count
        passed_checks = sum(1 for v in self.results.values() if v is True)

        self.log(f"Health Check Summary: {passed_checks}/{total_checks} checks passed")

        if self.errors:
            self.log("Errors found:", "ERROR")
            for error in self.errors:
                self.log(f"  - {error}", "ERROR")

            if self.alert_mode:
                self.send_alert()
        else:
            self.log("All systems operational!", "INFO")

    def send_alert(self):
        """Send alert (placeholder - implement email/SMS/webhook)"""
        self.log("ALERT: System health issues detected!", "ERROR")
        # TODO: Implement actual alerting mechanism
        # Could send email via Brevo, SMS, or webhook to monitoring service

def main():
    parser = argparse.ArgumentParser(description="EAM System Health Monitor")
    parser.add_argument("--alert", action="store_true", help="Send alerts on failures")
    parser.add_argument("--cron", action="store_true", help="Cron-friendly output (no colors)")
    args = parser.parse_args()

    monitor = HealthMonitor(alert_mode=args.alert, cron_mode=args.cron)
    monitor.run_all_checks()

    # Exit with code based on health
    if monitor.errors:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
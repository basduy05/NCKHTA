import os
import json
from typing import Dict, Any, Optional
from ..database import get_db

VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "BK1_dummy_public_key_for_iedu_push_notification_service_fallback")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "dummy_private_key_iedu")
VAPID_CLAIM_EMAIL = os.getenv("VAPID_CLAIM_EMAIL", "mailto:admin@iedu.edu.vn")

def save_push_subscription(user_id: int, endpoint: str, p256dh: str, auth: str) -> bool:
    """Save or update a browser push subscription for a user."""
    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, endpoint) DO UPDATE SET
                p256dh=excluded.p256dh,
                auth=excluded.auth,
                created_at=CURRENT_TIMESTAMP
        """, (user_id, endpoint, p256dh, auth))
        conn.commit()
        return True
    except Exception as e:
        print(f"[PUSH] Error saving subscription for user {user_id}: {e}")
        return False
    finally:
        conn.close()


def get_user_subscriptions(user_id: int):
    """Retrieve all active push subscriptions for a user."""
    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT endpoint, p256dh, auth
            FROM push_subscriptions
            WHERE user_id = ?
        """, (user_id,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def remove_push_subscription(user_id: int, endpoint: str):
    """Remove an expired or invalid subscription."""
    conn = get_db()
    try:
        conn.execute("""
            DELETE FROM push_subscriptions
            WHERE user_id = ? AND endpoint = ?
        """, (user_id, endpoint))
        conn.commit()
    finally:
        conn.close()


async def send_push_notification(user_id: int, title: str, body: str, url: str = "/dashboard/student?tab=vocabulary") -> Dict[str, Any]:
    """
    Send Web Push Notification to user's registered browsers.
    Falls back gracefully if pywebpush is not installed.
    """
    subscriptions = get_user_subscriptions(user_id)
    if not subscriptions:
        return {"success": False, "sent_count": 0, "message": "User has no registered push devices"}

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "icon": "/logo.png"
    })

    sent_count = 0
    try:
        from pywebpush import webpush, WebPushException
        has_pywebpush = True
    except ImportError:
        has_pywebpush = False

    if not has_pywebpush:
        # Fallback simulation for local dev environments without pywebpush C-libraries
        print(f"[PUSH SIMULATION] To user {user_id}: '{title}' - '{body}' ({len(subscriptions)} devices)")
        return {
            "success": True,
            "sent_count": len(subscriptions),
            "simulated": True,
            "message": "Notification dispatched (simulated mode, pywebpush not required)"
        }

    for sub in subscriptions:
        try:
            sub_info = {
                "endpoint": sub["endpoint"],
                "keys": {
                    "p256dh": sub["p256dh"],
                    "auth": sub["auth"]
                }
            }
            webpush(
                subscription_info=sub_info,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_CLAIM_EMAIL}
            )
            sent_count += 1
        except Exception as err:
            print(f"[PUSH ERROR] Failed to send push to endpoint {sub['endpoint'][:30]}: {err}")
            # If 404 or 410 Gone, remove stale subscription
            if "410" in str(err) or "404" in str(err):
                remove_push_subscription(user_id, sub["endpoint"])

    return {"success": True, "sent_count": sent_count}

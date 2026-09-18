import asyncio
import json
from typing import Dict, List, Optional
from datetime import datetime, timezone

# In-memory SSE queues: user_id -> list of active connection queues
_notification_queues: Dict[int, List[asyncio.Queue]] = {}
_lock = asyncio.Lock()

def _ensure_notifications_table(conn):
    """Ensure notifications table exists in database."""
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                sender_id INTEGER,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                category TEXT DEFAULT 'system',
                link TEXT,
                is_read BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT (DATETIME('now', '+7 hours'))
            )
        """)
        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read)")
        except Exception:
            pass
        conn.commit()
    except Exception as e:
        print(f"[NOTIFICATION DB] Table init warning: {e}", flush=True)

def save_notification(
    user_id: int,
    title: str,
    message: str,
    notif_type: str = "info",
    category: str = "system",
    link: Optional[str] = None,
    sender_id: Optional[int] = None
) -> Optional[int]:
    """Persist notification to database."""
    from ..database import get_db
    conn = get_db()
    _ensure_notifications_table(conn)
    notif_id = None
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO notifications (user_id, sender_id, title, message, type, category, link, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, DATETIME('now', '+7 hours'))
        """, (user_id, sender_id, title, message, notif_type.lower(), category.lower(), link))
        conn.commit()
        notif_id = getattr(cur, "lastrowid", None) or cur.last_insert_rowid if hasattr(cur, "last_insert_rowid") else None
    except Exception as e:
        print(f"[NOTIFICATION DB] Save error: {e}", flush=True)
    finally:
        try:
            conn.close()
        except Exception:
            pass
    return notif_id

def get_user_notifications(user_id: int, limit: int = 50) -> Dict:
    """Fetch user's notifications and unread count with Vietnam Time (GMT+7)."""
    from ..database import get_db
    from .time_utils import to_vn_iso
    conn = get_db()
    _ensure_notifications_table(conn)
    items = []
    unread_count = 0
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, user_id, sender_id, title, message, type, category, link, is_read, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
        """, (user_id, limit))
        rows = cur.fetchall()
        for r in rows:
            d = dict(r)
            items.append({
                "id": str(d.get("id")),
                "title": d.get("title", ""),
                "message": d.get("message", ""),
                "type": d.get("type", "info"),
                "category": d.get("category", "system"),
                "link": d.get("link"),
                "isRead": bool(d.get("is_read")),
                "timestamp": to_vn_iso(d.get("created_at"))
            })

        cur.execute("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND (is_read = 0 OR is_read IS NULL)", (user_id,))
        count_row = cur.fetchone()
        if count_row:
            unread_count = count_row[0]
    except Exception as e:
        print(f"[NOTIFICATION DB] Fetch error: {e}", flush=True)
    finally:
        try:
            conn.close()
        except Exception:
            pass
    return {"notifications": items, "unread_count": unread_count}

def mark_notification_as_read(user_id: int, notification_id: str) -> bool:
    """Mark a notification as read."""
    from ..database import get_db
    conn = get_db()
    try:
        conn.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?", (user_id, notification_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"[NOTIFICATION DB] Mark read error: {e}", flush=True)
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass

def mark_all_notifications_as_read(user_id: int) -> bool:
    """Mark all notifications as read for a user."""
    from ..database import get_db
    conn = get_db()
    try:
        conn.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (user_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"[NOTIFICATION DB] Mark all read error: {e}", flush=True)
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass

def clear_user_notifications(user_id: int) -> bool:
    """Delete all notifications for a user."""
    from ..database import get_db
    conn = get_db()
    try:
        conn.execute("DELETE FROM notifications WHERE user_id = ?", (user_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"[NOTIFICATION DB] Clear error: {e}", flush=True)
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass

async def register_listener(user_id: int) -> asyncio.Queue:
    """Register a new SSE stream listener for a user."""
    queue = asyncio.Queue(maxsize=50)
    async with _lock:
        if user_id not in _notification_queues:
            _notification_queues[user_id] = []
        _notification_queues[user_id].append(queue)
    return queue

async def unregister_listener(user_id: int, queue: asyncio.Queue):
    """Remove an SSE stream listener when client disconnects."""
    async with _lock:
        if user_id in _notification_queues:
            try:
                _notification_queues[user_id].remove(queue)
                if not _notification_queues[user_id]:
                    del _notification_queues[user_id]
            except ValueError:
                pass

async def notify_user(
    user_id: int,
    event_type: str,
    title: str,
    message: str,
    data: Optional[dict] = None,
    persist: bool = True,
    sender_id: Optional[int] = None
):
    """Send real-time notification to a specific user via SSE and persist to DB."""
    data = data or {}
    link = data.get("link")
    category = data.get("category", "system")
    notif_id = None
    if persist:
        try:
            notif_id = save_notification(
                user_id=user_id,
                title=title,
                message=message,
                notif_type=event_type,
                category=category,
                link=link,
                sender_id=sender_id
            )
        except Exception as e:
            print(f"[NOTIFY_USER DB ERROR]: {e}", flush=True)

    from .time_utils import now_vn_iso

    payload = {
        "id": str(notif_id) if notif_id else str(int(datetime.now().timestamp() * 1000)),
        "type": event_type,
        "category": category,
        "title": title,
        "message": message,
        "link": link,
        "data": data,
        "timestamp": now_vn_iso()
    }

    queues = _notification_queues.get(user_id, [])
    for q in queues:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            pass

async def broadcast_notification(
    event_type: str,
    title: str,
    message: str,
    data: Optional[dict] = None,
    target_user_ids: Optional[List[int]] = None,
    persist: bool = True,
    sender_id: Optional[int] = None
):
    """Broadcast notification to all currently connected users and persist in DB."""
    from .time_utils import now_vn_iso
    data = data or {}
    link = data.get("link")
    category = data.get("category", "system")

    # Persist for targets
    if persist:
        try:
            from ..database import get_db
            conn = get_db()
            if target_user_ids:
                uids = target_user_ids
            else:
                cur = conn.cursor()
                cur.execute("SELECT id FROM users")
                uids = [r[0] for r in cur.fetchall()]
            conn.close()

            for uid in uids:
                save_notification(
                    user_id=uid,
                    title=title,
                    message=message,
                    notif_type=event_type,
                    category=category,
                    link=link,
                    sender_id=sender_id
                )
        except Exception as e:
            print(f"[BROADCAST DB ERROR]: {e}", flush=True)

    payload = {
        "id": str(int(datetime.now().timestamp() * 1000)),
        "type": event_type,
        "category": category,
        "title": title,
        "message": message,
        "link": link,
        "data": data,
        "timestamp": now_vn_iso()
    }

    for user_id, queues in list(_notification_queues.items()):
        if target_user_ids is None or user_id in target_user_ids:
            for q in queues:
                try:
                    q.put_nowait(payload)
                except asyncio.QueueFull:
                    pass

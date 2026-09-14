import asyncio
import json
from typing import Dict, List, Optional
from datetime import datetime, timezone

# user_id -> list of active connection queues
_notification_queues: Dict[int, List[asyncio.Queue]] = {}
_lock = asyncio.Lock()

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

async def notify_user(user_id: int, event_type: str, title: str, message: str, data: Optional[dict] = None):
    """Send real-time notification to a specific user via SSE."""
    payload = {
        "type": event_type,
        "title": title,
        "message": message,
        "data": data or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    queues = _notification_queues.get(user_id, [])
    for q in queues:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            pass

async def broadcast_notification(event_type: str, title: str, message: str, data: Optional[dict] = None):
    """Broadcast notification to all currently connected users."""
    payload = {
        "type": event_type,
        "title": title,
        "message": message,
        "data": data or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    for user_id, queues in list(_notification_queues.items()):
        for q in queues:
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                pass

import asyncio
import json
from fastapi import APIRouter, Request, Query, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional

from ..services.notification_service import (
    register_listener, unregister_listener, notify_user,
    get_user_notifications, mark_notification_as_read,
    mark_all_notifications_as_read, clear_user_notifications
)
from ..services.auth_service import verify_access_token

router = APIRouter(prefix="/notifications", tags=["notifications"])

def _get_user_from_req(request: Request, token: Optional[str] = None) -> int:
    auth_header = request.headers.get("Authorization", "")
    raw_token = token
    if not raw_token and auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ")[1]
    if not raw_token:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    payload = verify_access_token(raw_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload["user_id"]

@router.get("")
@router.get("/")
def get_notifications(request: Request, token: Optional[str] = Query(None), limit: int = Query(50)):
    """Fetch stored notifications for the current authenticated user."""
    user_id = _get_user_from_req(request, token)
    return get_user_notifications(user_id, limit=limit)

@router.post("/{notification_id}/read")
def read_notification(notification_id: str, request: Request, token: Optional[str] = Query(None)):
    """Mark a single notification as read."""
    user_id = _get_user_from_req(request, token)
    success = mark_notification_as_read(user_id, notification_id)
    return {"success": success}

@router.post("/read-all")
def read_all_notifications(request: Request, token: Optional[str] = Query(None)):
    """Mark all notifications as read for current user."""
    user_id = _get_user_from_req(request, token)
    success = mark_all_notifications_as_read(user_id)
    return {"success": success}

@router.delete("/clear-all")
@router.post("/clear-all")
def clear_notifications(request: Request, token: Optional[str] = Query(None)):
    """Clear all notifications for current user."""
    user_id = _get_user_from_req(request, token)
    success = clear_user_notifications(user_id)
    return {"success": success}

@router.get("/stream")
async def notification_stream(request: Request, token: Optional[str] = Query(None)):
    """
    SSE stream for real-time notifications.
    Supports JWT token in query param (for EventSource) or Authorization header.
    """
    auth_header = request.headers.get("Authorization")
    raw_token = token
    if not raw_token and auth_header and auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ")[1]
        
    if not raw_token:
        raise HTTPException(status_code=401, detail="Missing authentication token")
        
    payload = verify_access_token(raw_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    user_id = payload["user_id"]
    queue = await register_listener(user_id)
    
    async def event_generator():
        try:
            # Initial connection confirmation event
            welcome = {
                "type": "CONNECTED",
                "title": "Connected",
                "message": "Real-time notification stream active",
                "data": {"user_id": user_id}
            }
            yield f"data: {json.dumps(welcome)}\n\n"
            
            while True:
                if await request.is_disconnected():
                    break
                try:
                    # Wait for message with 15s timeout to send heartbeat ping
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(msg)}\n\n"
                except asyncio.TimeoutError:
                    # Keepalive heartbeat ping
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await unregister_listener(user_id, queue)
            
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@router.post("/test-trigger")
async def test_trigger_notification(user_id: int = Query(...), title: str = Query("Test"), message: str = Query("Test Notification")):
    """Trigger a test notification to a specific user."""
    await notify_user(user_id, "TEST", title, message, {"source": "admin_test"})
    return {"status": "ok", "message": f"Sent notification to user {user_id}"}


@router.post("/push-subscribe")
async def subscribe_push(request: Request):
    """Register client WebPush subscription for FSRS reminders."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth_header.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    data = await request.json()
    from ..services.push_service import save_push_subscription
    success = save_push_subscription(payload["user_id"], data)
    if success:
        return {"status": "subscribed", "message": "Đăng ký nhận thông báo đẩy thành công"}
    raise HTTPException(status_code=400, detail="Failed to save push subscription")


@router.delete("/push-unsubscribe")
async def unsubscribe_push(request: Request, endpoint: str = Query(...)):
    """Unregister client WebPush subscription."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth_header.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    from ..services.push_service import delete_push_subscription
    success = delete_push_subscription(payload["user_id"], endpoint)
    return {"status": "unsubscribed", "success": success}


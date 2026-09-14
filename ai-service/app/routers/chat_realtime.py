import json
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from ..dependencies import get_current_user
from ..services import auth_service
from ..services.chat_service import (
    chat_manager,
    get_user_rooms,
    create_or_get_direct_room,
    create_group_room,
    get_room_messages,
    save_message,
    mark_room_read,
    search_users_for_chat
)

router = APIRouter(prefix="/chat", tags=["Realtime Chat"])

class DirectRoomRequest(BaseModel):
    target_user_id: int

class GroupRoomRequest(BaseModel):
    name: str
    member_ids: List[int]
    avatar_url: Optional[str] = ""

class SendMessageRequest(BaseModel):
    content: str
    message_type: Optional[str] = "text"


@router.get("/rooms")
def list_rooms(current_user: dict = Depends(get_current_user)):
    """List all chat rooms (direct & group) for current user."""
    try:
        return get_user_rooms(current_user["id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải danh sách phòng chat: {str(e)}")


@router.post("/rooms/direct")
def open_direct_room(data: DirectRoomRequest, current_user: dict = Depends(get_current_user)):
    """Open or create a 1-on-1 private chat room with another user."""
    if data.target_user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Không thể tạo cuộc trò chuyện với chính mình")
    try:
        room = create_or_get_direct_room(current_user["id"], data.target_user_id)
        return room
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo cuộc trò chuyện: {str(e)}")


@router.post("/rooms/group")
def open_group_room(data: GroupRoomRequest, current_user: dict = Depends(get_current_user)):
    """Create a new group chat room."""
    if not data.name or not data.name.strip():
        raise HTTPException(status_code=400, detail="Tên nhóm không được để trống")
    try:
        room = create_group_room(
            name=data.name.strip(),
            created_by=current_user["id"],
            member_ids=data.member_ids,
            avatar_url=data.avatar_url or ""
        )
        return room
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo nhóm: {str(e)}")


@router.get("/rooms/{room_id}/messages")
def list_messages(
    room_id: int,
    limit: int = Query(50, ge=1, le=100),
    before_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get message history for a chat room."""
    try:
        messages = get_room_messages(room_id, current_user["id"], limit=limit, before_id=before_id)
        return messages
    except PermissionError:
        raise HTTPException(status_code=403, detail="Bạn không phải thành viên của cuộc trò chuyện này")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải tin nhắn: {str(e)}")


@router.post("/rooms/{room_id}/read")
def mark_read(room_id: int, current_user: dict = Depends(get_current_user)):
    """Mark all messages in a chat room as read."""
    try:
        mark_room_read(room_id, current_user["id"])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật trạng thái đọc: {str(e)}")


@router.get("/users/search")
def search_users(
    q: str = Query("", min_length=0),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Search for users by name or email to start a conversation."""
    try:
        users = search_users_for_chat(q, current_user["id"], limit=limit)
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tìm kiếm người dùng: {str(e)}")


@router.get("/users/online")
def get_online_status(current_user: dict = Depends(get_current_user)):
    """Return list of user IDs who are currently online."""
    online_ids = chat_manager.get_online_users()
    return {"online_user_ids": online_ids}


@router.post("/presence/heartbeat")
def presence_heartbeat(current_user: dict = Depends(get_current_user)):
    """Ping presence heartbeat to keep user marked as online."""
    user_id = current_user["id"]
    chat_manager.online_users.add(user_id)
    chat_manager.set_user_presence_db(user_id, is_online=True)
    return {"status": "ok", "user_id": user_id}


# --- WEBSOCKET REALTIME ENDPOINT ---

@router.websocket("/ws/{room_id}")
async def chat_websocket(
    websocket: WebSocket,
    room_id: int,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for realtime room messaging.
    Connect with: 
      - ws://<host>/chat/ws/<room_id>?token=<jwt_access_token>
      - OR subprotocol: new WebSocket(url, [token])
    """
    auth_token = token
    subprotocol = None
    if not auth_token:
        proto_header = websocket.headers.get("sec-websocket-protocol")
        if proto_header:
            protocols = [p.strip() for p in proto_header.split(",") if p.strip()]
            if protocols:
                auth_token = protocols[0]
                subprotocol = auth_token

    if not auth_token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Authenticate JWT token
    payload = auth_service.verify_access_token(auth_token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload["user_id"]
    email = payload.get("email", "")

    # Fetch user display name
    user_name = email.split("@")[0]
    try:
        from ..database import get_db
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if row and row['name']:
            user_name = row['name']
        conn.close()
    except Exception:
        pass

    await chat_manager.connect(websocket, room_id, user_id, subprotocol=subprotocol)

    # Broadcast user online status
    await chat_manager.broadcast_presence(user_id, True)

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except Exception:
                continue

            event_type = data.get("type", "message")

            if event_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    continue

                msg_type = data.get("message_type", "text")
                try:
                    saved = save_message(
                        room_id=room_id,
                        sender_id=user_id,
                        content=content,
                        message_type=msg_type
                    )
                    # Broadcast new message to room members
                    await chat_manager.broadcast_to_room(room_id, {
                        "type": "message",
                        "message": saved
                    })
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "detail": str(e)
                    }))

            elif event_type == "typing":
                # Broadcast typing status
                is_typing = bool(data.get("is_typing", False))
                await chat_manager.broadcast_to_room(room_id, {
                    "type": "typing",
                    "user_id": user_id,
                    "user_name": user_name,
                    "is_typing": is_typing
                })

            elif event_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        chat_manager.disconnect(websocket, room_id, user_id)
        if user_id not in chat_manager.online_users:
            await chat_manager.broadcast_presence(user_id, False)
    except Exception as e:
        print(f"[WS ERROR] room {room_id}, user {user_id}: {e}")
        chat_manager.disconnect(websocket, room_id, user_id)

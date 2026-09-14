import json
import asyncio
import re
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
    search_users_for_chat,
    toggle_message_reaction
)

router = APIRouter(prefix="/chat", tags=["Realtime Chat"])

# ---------------------------------------------------------------------------
# Phase 3 (3.7): AI Teacher Bot in Group Chat
# ---------------------------------------------------------------------------
async def _handle_ai_teacher_bot(room_id: int, user_message: str, user_name: str):
    """Generate and broadcast AI Teacher Bot response when invoked with @ai or @teacher."""
    from ..services.llm_service import query_llm

    prompt_query = re.sub(r"@(?:ai|bot|teacher|giaovien)\b", "", user_message, flags=re.IGNORECASE).strip()
    if not prompt_query:
        prompt_query = "Xin chào AI Teacher, bạn có thể hướng dẫn tôi học tiếng Anh không?"

    system_prompt = (
        "Bạn là 'AI Teacher 🤖' - trợ lý giáo viên tiếng Anh thông minh, ân cần của hệ thống iEdu. "
        "Bạn đang tham gia nhóm học tập của học sinh. Hãy trả lời câu hỏi ngắn gọn (tối đa 3-4 câu), "
        "chuẩn xác ngữ pháp, từ vựng hoặc phát âm, có ví dụ song ngữ Anh-Việt và sử dụng emoji sinh động."
    )
    user_prompt = f"Học sinh {user_name} hỏi: {prompt_query}"

    try:
        await asyncio.sleep(0.4)
        bot_reply = query_llm(system_prompt, user_prompt, temperature=0.7)
        if not bot_reply or len(bot_reply.strip()) == 0:
            bot_reply = f"Chào {user_name}! Thầy/Cô AI luôn sẵn sàng hỗ trợ. Bạn hãy đặt câu hỏi cụ thể về từ vựng, ngữ pháp nhé!"

        bot_saved = save_message(
            room_id=room_id,
            sender_id=None,
            content=bot_reply,
            message_type="text",
            is_bot=True
        )

        await chat_manager.broadcast_to_room(room_id, {
            "type": "message",
            "message": bot_saved
        })
    except Exception as e:
        print(f"[AI TEACHER BOT ERROR] room_id={room_id}: {e}")

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


class ReactionRequest(BaseModel):
    emoji: str

@router.post("/messages/{message_id}/reactions")
async def react_to_message(
    message_id: int,
    data: ReactionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Phase 2 - Task 2.10: Emoji reaction on chat message.
    Toggles reaction (adds if not present, removes if clicked again)
    and broadcasts event to all room members via WebSocket.
    """
    try:
        res = toggle_message_reaction(message_id, current_user["id"], data.emoji)
        
        # Broadcast reaction to room members
        from ..database import get_db
        conn = get_db()
        row = conn.execute("SELECT room_id FROM chat_messages WHERE id = ?", (message_id,)).fetchone()
        conn.close()
        if row:
            room_id = row["room_id"]
            await chat_manager.broadcast_to_room(room_id, {
                "type": "reaction",
                "message_id": message_id,
                "reactions": res.get("reactions", [])
            })

        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi thêm biểu cảm: {str(e)}")


class UploadImageRequest(BaseModel):
    image_base64: str
    file_name: Optional[str] = "image.png"

@router.post("/upload-image")
def upload_chat_image(data: UploadImageRequest, current_user: dict = Depends(get_current_user)):
    """
    Phase 2 - Task 2.10: Image attachment upload for chat.
    Validates base64 image data and returns clean data URI / storage path.
    """
    raw = data.image_base64.strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Dữ liệu ảnh không được để trống")
    
    # Ensure proper data URI prefix
    if not raw.startswith("data:image/"):
        raw = f"data:image/png;base64,{raw}"

    # Basic size limit (approx 5MB base64 ~ 3.7MB file)
    if len(raw) > 7_000_000:
        raise HTTPException(status_code=400, detail="Kích thước ảnh tối đa 5MB")

    return {
        "status": "success",
        "image_url": raw,
        "sender_id": current_user["id"]
    }


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

                    # Phase 3 (3.7): Trigger AI Teacher Bot if tagged
                    lower_content = content.lower()
                    if any(t in lower_content for t in ["@ai", "@bot", "@teacher", "@giaovien"]):
                        asyncio.create_task(_handle_ai_teacher_bot(room_id, content, user_name))
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

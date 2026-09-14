import asyncio
import json
import time
from typing import Dict, List, Optional, Set
from fastapi import WebSocket
from ..database import get_db

class ChatConnectionManager:
    """
    Manages in-memory WebSocket connections for chat rooms and user presence.
    No Redis required — thread-safe in asyncio event loop.
    """
    def __init__(self):
        # room_id -> {user_id: WebSocket}
        self.room_connections: Dict[int, Dict[int, WebSocket]] = {}
        # user_id -> Set[WebSocket] (across all open rooms/tabs)
        self.user_sockets: Dict[int, Set[WebSocket]] = {}
        # Set of currently online user IDs
        self.online_users: Set[int] = set()

    async def connect(self, websocket: WebSocket, room_id: int, user_id: int):
        await websocket.accept()

        if room_id not in self.room_connections:
            self.room_connections[room_id] = {}
        self.room_connections[room_id][user_id] = websocket

        if user_id not in self.user_sockets:
            self.user_sockets[user_id] = set()
        self.user_sockets[user_id].add(websocket)

        self.online_users.add(user_id)
        self.set_user_presence_db(user_id, is_online=True)

    def disconnect(self, websocket: WebSocket, room_id: int, user_id: int):
        # Remove from room
        if room_id in self.room_connections:
            self.room_connections[room_id].pop(user_id, None)
            if not self.room_connections[room_id]:
                del self.room_connections[room_id]

        # Remove from user sockets
        if user_id in self.user_sockets:
            self.user_sockets[user_id].discard(websocket)
            if not self.user_sockets[user_id]:
                del self.user_sockets[user_id]
                self.online_users.discard(user_id)
                self.set_user_presence_db(user_id, is_online=False)

    async def broadcast_to_room(self, room_id: int, message: dict):
        if room_id in self.room_connections:
            closed_users = []
            for uid, ws in self.room_connections[room_id].items():
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    closed_users.append(uid)

            for uid in closed_users:
                self.room_connections[room_id].pop(uid, None)

    async def broadcast_presence(self, user_id: int, is_online: bool):
        payload = {
            "type": "presence",
            "user_id": user_id,
            "is_online": is_online,
            "timestamp": int(time.time())
        }
        # Broadcast to all connected sockets
        all_sockets = [ws for s in self.user_sockets.values() for ws in s]
        for ws in all_sockets:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                pass

    def set_user_presence_db(self, user_id: int, is_online: bool, status_text: str = ""):
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO user_presence (user_id, is_online, last_seen, status_text)
                VALUES (?, ?, CURRENT_TIMESTAMP, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    is_online = excluded.is_online,
                    last_seen = CURRENT_TIMESTAMP,
                    status_text = CASE WHEN excluded.status_text != '' THEN excluded.status_text ELSE user_presence.status_text END
            """, (user_id, 1 if is_online else 0, status_text))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[CHAT PRESENCE DB ERROR] user_id={user_id}: {e}")

    def get_online_users(self) -> List[int]:
        # Consider users with active sockets or updated in last 2 minutes online
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT user_id FROM user_presence 
                WHERE is_online = 1 OR datetime(last_seen, '+3 minutes') >= datetime('now')
            """)
            rows = cursor.fetchall()
            conn.close()
            db_online = {r['user_id'] for r in rows}
            return list(self.online_users.union(db_online))
        except Exception:
            return list(self.online_users)

chat_manager = ChatConnectionManager()

# --- DATABASE REPOSITORY METHODS ---

def get_user_rooms(user_id: int) -> List[dict]:
    """Fetch all chat rooms that a user is member of, including latest message and other party info."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT r.id, r.name, r.room_type, r.avatar_url, r.created_by, r.updated_at,
               m.role as my_role, m.last_read_at
        FROM chat_rooms r
        JOIN chat_members m ON r.id = m.room_id
        WHERE m.user_id = ?
        ORDER BY r.updated_at DESC
    """, (user_id,))
    rooms = cursor.fetchall()
    
    result = []
    for r in rooms:
        room_dict = dict(r)
        
        # Get latest message
        cursor.execute("""
            SELECT m.id, m.sender_id, m.content, m.message_type, m.created_at, u.name as sender_name
            FROM chat_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.room_id = ?
            ORDER BY m.id DESC LIMIT 1
        """, (r['id'],))
        latest_msg = cursor.fetchone()
        room_dict['latest_message'] = dict(latest_msg) if latest_msg else None
        
        # Calculate unread count
        last_read = r['last_read_at'] or '1970-01-01'
        cursor.execute("""
            SELECT COUNT(*) as unread_count
            FROM chat_messages
            WHERE room_id = ? AND sender_id != ? AND created_at > ?
        """, (r['id'], user_id, last_read))
        unread = cursor.fetchone()
        room_dict['unread_count'] = unread['unread_count'] if unread else 0
        
        # For direct rooms, enrich name and target user info
        if r['room_type'] == 'direct':
            cursor.execute("""
                SELECT u.id, u.name, u.email, u.role, p.is_online, p.last_seen
                FROM chat_members cm
                JOIN users u ON cm.user_id = u.id
                LEFT JOIN user_presence p ON u.id = p.user_id
                WHERE cm.room_id = ? AND cm.user_id != ?
                LIMIT 1
            """, (r['id'], user_id))
            other_user = cursor.fetchone()
            if other_user:
                room_dict['other_user'] = dict(other_user)
                if not room_dict['name']:
                    room_dict['name'] = other_user['name']
        else:
            # For group rooms, fetch member count
            cursor.execute("SELECT COUNT(*) as member_count FROM chat_members WHERE room_id = ?", (r['id'],))
            cnt = cursor.fetchone()
            room_dict['member_count'] = cnt['member_count'] if cnt else 0

        result.append(room_dict)

    conn.close()
    return result


def create_or_get_direct_room(user_a: int, user_b: int) -> dict:
    """Find an existing 1-on-1 direct chat room between user_a and user_b, or create one."""
    if user_a == user_b:
        raise ValueError("Cannot chat with yourself")

    conn = get_db()
    cursor = conn.cursor()

    # Find room where both user_a and user_b are members and room_type = 'direct'
    cursor.execute("""
        SELECT r.id, r.name, r.room_type, r.avatar_url, r.created_at
        FROM chat_rooms r
        JOIN chat_members m1 ON r.id = m1.room_id AND m1.user_id = ?
        JOIN chat_members m2 ON r.id = m2.room_id AND m2.user_id = ?
        WHERE r.room_type = 'direct'
        LIMIT 1
    """, (user_a, user_b))
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return dict(existing)

    # Otherwise create direct room
    cursor.execute("""
        INSERT INTO chat_rooms (room_type, created_by)
        VALUES ('direct', ?)
    """, (user_a,))
    room_id = cursor.lastrowid

    cursor.execute("INSERT INTO chat_members (room_id, user_id, role) VALUES (?, ?, 'member')", (room_id, user_a))
    cursor.execute("INSERT INTO chat_members (room_id, user_id, role) VALUES (?, ?, 'member')", (room_id, user_b))
    conn.commit()

    cursor.execute("SELECT * FROM chat_rooms WHERE id = ?", (room_id,))
    new_room = dict(cursor.fetchone())
    conn.close()
    return new_room


def create_group_room(name: str, created_by: int, member_ids: List[int], avatar_url: str = "") -> dict:
    """Create a new group chat room."""
    clean_name = name.strip()
    if not clean_name:
        raise ValueError("Group name cannot be empty")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO chat_rooms (name, room_type, created_by, avatar_url)
        VALUES (?, 'group', ?, ?)
    """, (clean_name, created_by, avatar_url))
    room_id = cursor.lastrowid

    # Add owner
    cursor.execute("INSERT INTO chat_members (room_id, user_id, role) VALUES (?, ?, 'owner')", (room_id, created_by))

    # Add other members
    for uid in set(member_ids):
        if uid != created_by:
            cursor.execute("INSERT OR IGNORE INTO chat_members (room_id, user_id, role) VALUES (?, ?, 'member')", (room_id, uid))

    # Add system initial message
    cursor.execute("""
        INSERT INTO chat_messages (room_id, sender_id, message_type, content)
        VALUES (?, ?, 'system', ?)
    """, (room_id, created_by, f"Nhóm '{clean_name}' đã được tạo."))

    conn.commit()

    cursor.execute("SELECT * FROM chat_rooms WHERE id = ?", (room_id,))
    room = dict(cursor.fetchone())
    conn.close()
    return room


def get_room_messages(room_id: int, user_id: int, limit: int = 50, before_id: Optional[int] = None) -> List[dict]:
    """Retrieve history messages of a room if user is member."""
    conn = get_db()
    cursor = conn.cursor()

    # Verify membership
    cursor.execute("SELECT role FROM chat_members WHERE room_id = ? AND user_id = ?", (room_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise PermissionError("User is not a member of this chat room")

    if before_id:
        cursor.execute("""
            SELECT m.id, m.room_id, m.sender_id, m.message_type, m.content, m.created_at,
                   u.name as sender_name, u.role as sender_role
            FROM chat_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.room_id = ? AND m.id < ?
            ORDER BY m.id DESC
            LIMIT ?
        """, (room_id, before_id, limit))
    else:
        cursor.execute("""
            SELECT m.id, m.room_id, m.sender_id, m.message_type, m.content, m.created_at,
                   u.name as sender_name, u.role as sender_role
            FROM chat_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.room_id = ?
            ORDER BY m.id DESC
            LIMIT ?
        """, (room_id, limit))

    rows = cursor.fetchall()
    conn.close()
    # Return chronologically ascending (oldest first)
    return [dict(r) for r in reversed(rows)]


def save_message(room_id: int, sender_id: int, content: str, message_type: str = "text") -> dict:
    """Save a chat message and update room updated_at."""
    clean_content = content.strip()
    if not clean_content:
        raise ValueError("Message content cannot be empty")

    conn = get_db()
    cursor = conn.cursor()

    # Check sender is member
    cursor.execute("SELECT role FROM chat_members WHERE room_id = ? AND user_id = ?", (room_id, sender_id))
    if not cursor.fetchone():
        conn.close()
        raise PermissionError("Sender is not a member of this chat room")

    cursor.execute("""
        INSERT INTO chat_messages (room_id, sender_id, message_type, content)
        VALUES (?, ?, ?, ?)
    """, (room_id, sender_id, message_type, clean_content))
    msg_id = cursor.lastrowid

    # Update room updated_at
    cursor.execute("UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (room_id,))
    # Update sender last_read_at
    cursor.execute("UPDATE chat_members SET last_read_at = CURRENT_TIMESTAMP WHERE room_id = ? AND user_id = ?", (room_id, sender_id))
    conn.commit()

    cursor.execute("""
        SELECT m.id, m.room_id, m.sender_id, m.message_type, m.content, m.created_at,
               u.name as sender_name, u.role as sender_role
        FROM chat_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
    """, (msg_id,))
    saved = dict(cursor.fetchone())
    conn.close()
    return saved


def mark_room_read(room_id: int, user_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE chat_members SET last_read_at = CURRENT_TIMESTAMP WHERE room_id = ? AND user_id = ?", (room_id, user_id))
    conn.commit()
    conn.close()


def search_users_for_chat(query: str, current_user_id: int, limit: int = 20) -> List[dict]:
    """Search for users by name or email to start a chat. Empty query returns recent/online users."""
    conn = get_db()
    cursor = conn.cursor()
    clean_q = query.strip()
    if clean_q:
        search_term = f"%{clean_q}%"
        cursor.execute("""
            SELECT u.id, u.name, u.email, u.role, p.is_online, p.last_seen
            FROM users u
            LEFT JOIN user_presence p ON u.id = p.user_id
            WHERE u.id != ? AND (u.name LIKE ? OR u.email LIKE ?)
            ORDER BY p.is_online DESC, u.name ASC
            LIMIT ?
        """, (current_user_id, search_term, search_term, limit))
    else:
        cursor.execute("""
            SELECT u.id, u.name, u.email, u.role, p.is_online, p.last_seen
            FROM users u
            LEFT JOIN user_presence p ON u.id = p.user_id
            WHERE u.id != ?
            ORDER BY p.is_online DESC, u.name ASC
            LIMIT ?
        """, (current_user_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

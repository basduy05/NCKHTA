import random
import string
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional, List
from ..database import get_db
from ..services import auth_service

router = APIRouter(prefix="/groups", tags=["Study Groups"])

def _get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization[7:]
    payload = auth_service.verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    conn = get_db()
    user = conn.execute("SELECT id, name, email, points FROM users WHERE id = ?", (payload["user_id"],)).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(user)

def _generate_invite_code(length: int = 6) -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(length))

class CreateGroupRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    max_members: Optional[int] = 20

class JoinGroupRequest(BaseModel):
    invite_code: str

class CreateChallengeRequest(BaseModel):
    title: str
    target_type: str = "words_learned"
    target_value: int = 50
    end_date: Optional[str] = None

@router.post("/create")
def create_study_group(req: CreateGroupRequest, authorization: str = Header(...)):
    user = _get_current_user(authorization)
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Group name is required")

    conn = get_db()
    try:
        # Generate unique invite code
        for _ in range(10):
            code = _generate_invite_code()
            exists = conn.execute("SELECT id FROM study_groups WHERE invite_code = ?", (code,)).fetchone()
            if not exists:
                break

        cursor = conn.execute("""
            INSERT INTO study_groups (name, description, owner_id, invite_code, max_members)
            VALUES (?, ?, ?, ?, ?)
        """, (req.name.strip(), req.description or "", user["id"], code, req.max_members or 20))
        group_id = cursor.lastrowid

        # Add creator as owner member
        conn.execute("""
            INSERT INTO group_members (group_id, user_id, role)
            VALUES (?, ?, 'owner')
        """, (group_id, user["id"]))
        conn.commit()

        return {
            "status": "success",
            "group_id": group_id,
            "invite_code": code,
            "name": req.name.strip()
        }
    finally:
        conn.close()

@router.post("/join")
def join_study_group(req: JoinGroupRequest, authorization: str = Header(...)):
    user = _get_current_user(authorization)
    code = req.invite_code.strip().upper()
    conn = get_db()
    try:
        grp = conn.execute("SELECT * FROM study_groups WHERE invite_code = ?", (code,)).fetchone()
        if not grp:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm với mã mời này.")

        # Check member count
        count = conn.execute("SELECT COUNT(*) FROM group_members WHERE group_id = ?", (grp["id"],)).fetchone()[0]
        if count >= grp["max_members"]:
            raise HTTPException(status_code=400, detail="Nhóm đã đạt số lượng thành viên tối đa.")

        # Check if already a member
        existing = conn.execute("""
            SELECT role FROM group_members WHERE group_id = ? AND user_id = ?
        """, (grp["id"], user["id"])).fetchone()
        if existing:
            return {"status": "already_member", "group_id": grp["id"], "name": grp["name"]}

        conn.execute("""
            INSERT INTO group_members (group_id, user_id, role)
            VALUES (?, ?, 'member')
        """, (grp["id"], user["id"]))
        conn.commit()

        return {"status": "joined", "group_id": grp["id"], "name": grp["name"]}
    finally:
        conn.close()

@router.get("/my")
def get_my_groups(authorization: str = Header(...)):
    user = _get_current_user(authorization)
    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT g.id, g.name, g.description, g.invite_code, g.max_members, g.owner_id,
                   gm.role, gm.joined_at,
                   (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as members_count
            FROM group_members gm
            JOIN study_groups g ON gm.group_id = g.id
            WHERE gm.user_id = ?
            ORDER BY gm.joined_at DESC
        """, (user["id"],)).fetchall()

        return {"groups": [dict(r) for r in rows]}
    finally:
        conn.close()

@router.get("/{group_id}")
def get_group_details(group_id: int, authorization: str = Header(...)):
    user = _get_current_user(authorization)
    conn = get_db()
    try:
        grp = conn.execute("SELECT * FROM study_groups WHERE id = ?", (group_id,)).fetchone()
        if not grp:
            raise HTTPException(status_code=404, detail="Nhóm không tồn tại")

        # Members Leaderboard sorted by points
        members = conn.execute("""
            SELECT u.id, u.name, u.email, COALESCE(u.points, 0) as points, gm.role, gm.joined_at,
                   (SELECT COUNT(*) FROM saved_vocabulary WHERE user_id = u.id) as vocab_count
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ?
            ORDER BY points DESC, vocab_count DESC
        """, (group_id,)).fetchall()

        # Challenges
        challenges = conn.execute("""
            SELECT * FROM group_challenges WHERE group_id = ? ORDER BY created_at DESC
        """, (group_id,)).fetchall()

        return {
            "group": dict(grp),
            "members": [dict(m) for m in members],
            "challenges": [dict(c) for c in challenges]
        }
    finally:
        conn.close()

@router.post("/{group_id}/challenges")
def create_group_challenge(group_id: int, req: CreateChallengeRequest, authorization: str = Header(...)):
    user = _get_current_user(authorization)
    conn = get_db()
    try:
        # Check membership
        member = conn.execute("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, user["id"])).fetchone()
        if not member:
            raise HTTPException(status_code=403, detail="Bạn không phải thành viên của nhóm này")

        conn.execute("""
            INSERT INTO group_challenges (group_id, title, target_type, target_value, end_date)
            VALUES (?, ?, ?, ?, ?)
        """, (group_id, req.title.strip(), req.target_type, req.target_value, req.end_date))
        conn.commit()
        return {"status": "created", "title": req.title.strip()}
    finally:
        conn.close()

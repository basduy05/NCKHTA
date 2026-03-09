from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .services import auth_service
from .database import get_db

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = auth_service.verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("user_id")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, role, is_active FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    is_active = user["is_active"] if "is_active" in user.keys() else 1
    if not is_active:
        raise HTTPException(status_code=403, detail="User account is disabled")
        
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"].upper() != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

async def get_teacher_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"].upper() not in ["TEACHER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher or Admin privileges required"
        )
    return current_user

async def get_student_user(current_user: dict = Depends(get_current_user)):
    # Students, teachers, and admins can often access student-level data
    return current_user

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .services import auth_service
from .database import get_db

security = HTTPBearer()

import time

_user_cache = {}
USER_CACHE_TTL = 30  # seconds

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    now = time.time()
    
    # Check cache first
    cached = _user_cache.get(token)
    if cached and now - cached['time'] < USER_CACHE_TTL:
        return cached['user']
        
    conn = None
    user = None
    try:
        conn = get_db()
        payload = auth_service.verify_access_token(token, conn=conn)
        if not payload:
            if conn: conn.close()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = payload.get("user_id")
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, role, is_active FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
    except Exception as e:
        if conn: 
            try: conn.close()
            except: pass
        if isinstance(e, HTTPException): raise e
        print(f"[AUTH ERROR] Database error in get_current_user: {e}")
        raise HTTPException(status_code=500, detail="Database connection error during authentication")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    is_active = user["is_active"] if "is_active" in user.keys() else 1
    if not is_active:
        raise HTTPException(status_code=403, detail="User account is disabled")
        
    # Update cache
    _user_cache[token] = {'user': user, 'time': now}
    
    # Cleanup big cache periodically (~1% chance to run)
    if len(_user_cache) > 1000 and int(now) % 100 == 0:
        keys_to_del = [k for k, v in _user_cache.items() if now - v['time'] > USER_CACHE_TTL]
        for k in keys_to_del:
            del _user_cache[k]
            
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

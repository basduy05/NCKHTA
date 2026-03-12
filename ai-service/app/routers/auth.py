from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks, Header
from pydantic import BaseModel, EmailStr
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import sqlite3
import time
from ..database import get_db, UserCreate
from ..services import auth_service
from ..dependencies import get_admin_user, get_current_user
from ..services.auth_service import (
    UserRegister, UserLogin, OTPVerify, OTP_EXPIRE_MINUTES,
    LoginOTPRequest, VerifyLoginOTP
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# ---------------------------------------------------------------------------
# Pydantic models for request bodies
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Pydantic models for request bodies
# ---------------------------------------------------------------------------
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: str

class NotifyRequest(BaseModel):
    email: EmailStr
    title: str
    message: str

# ---------------------------------------------------------------------------
# Simple in-memory login attempt tracking (per email)
# ---------------------------------------------------------------------------
_login_attempts: dict = {}   # email -> [timestamps]
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 300   # 5 minutes


def _check_login_rate_limit(email: str):
    """Raise 429 if too many failed login attempts in the last 5 minutes."""
    now = time.time()
    attempts = [t for t in _login_attempts.get(email, []) if now - t < LOGIN_WINDOW_SECONDS]
    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed login attempts. Please wait {LOGIN_WINDOW_SECONDS // 60} minutes.",
        )


def _record_failed_login(email: str):
    now = time.time()
    attempts = _login_attempts.get(email, [])
    attempts.append(now)
    _login_attempts[email] = attempts[-MAX_LOGIN_ATTEMPTS * 2:]  # keep bounded


def _clear_login_attempts(email: str):
    _login_attempts.pop(email, None)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister, background_tasks: BackgroundTasks):
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (user.email,))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Email already registered")

        # Generate OTP & Hash Password
        otp = auth_service.generate_otp()
        hashed_password = auth_service.get_password_hash(user.password)
        otp_expires = int(time.time()) + OTP_EXPIRE_MINUTES * 60

        # Insert user with phone number if provided
        if user.phone:
            cursor.execute(
                "INSERT INTO users (name, email, role, password_hash, phone, otp, otp_expires, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (user.name, user.email, user.role, hashed_password, user.phone, otp, otp_expires, 0)
            )
        else:
            cursor.execute(
                "INSERT INTO users (name, email, role, password_hash, otp, otp_expires, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (user.name, user.email, user.role, hashed_password, otp, otp_expires, 0)
            )
        conn.commit()
        conn.close()

        # Send OTP email asynchronously in the background
        background_tasks.add_task(auth_service.send_otp_email, user.email, otp)

        return {"message": "User registered. Please check email for OTP.", "email": user.email}

    except sqlite3.OperationalError as e:
        if 'conn' in locals() and conn:
            conn.close()
        raise HTTPException(status_code=500, detail=f"Database schema error: {e}. Please restart service to migrate.")
    except HTTPException:
        raise
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.post("/verify-otp")
async def verify_otp(data: OTPVerify, background_tasks: BackgroundTasks):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, otp, otp_expires FROM users WHERE email = ?", (data.email,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    # Check OTP expiry
    otp_expires = user['otp_expires'] if 'otp_expires' in (user.keys() if hasattr(user, 'keys') else {}) else None
    if otp_expires and int(time.time()) > otp_expires:
        conn.close()
        raise HTTPException(status_code=400, detail="OTP has expired. Please register again or request a new OTP.")

    if user['otp'] != data.otp:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Activate user
    try:
        cursor.execute(
            "UPDATE users SET is_verified = 1, otp = NULL, otp_expires = NULL WHERE id = ?",
            (user['id'],)
        )
        conn.commit()
        conn.close()

        # Send welcome email asynchronously
        background_tasks.add_task(auth_service.send_welcome_email, data.email, user['name'])

    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "Account verified successfully. You can now login."}


@router.post("/login")
async def login(data: UserLogin):
    try:
        # Rate limit check before DB query
        _check_login_rate_limit(data.email)

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, name, role, password_hash, is_verified, phone FROM users WHERE email = ?",
            (data.email,)
        )
        user = cursor.fetchone()
        conn.close()

        if not user:
            _record_failed_login(data.email)
            raise HTTPException(status_code=400, detail="User not found")

        if not auth_service.verify_password(data.password, user['password_hash']):
            _record_failed_login(data.email)
            raise HTTPException(status_code=400, detail="Incorrect password")

        if not user['is_verified']:
            raise HTTPException(status_code=400, detail="Account not verified. Please verify OTP first.")

        # Success — clear failed attempts counter
        _clear_login_attempts(data.email)

        # Generate JWT token
        access_token = auth_service.generate_access_token(user['id'], data.email)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": data.email,
                "role": user['role'],
                "phone": user.get('phone', '')
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


# --- Login 2FA OTP endpoints ---
@router.post("/login/send-otp")
async def login_send_otp(data: LoginOTPRequest, background_tasks: BackgroundTasks):
    """Send OTP for login 2FA verification."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, is_verified FROM users WHERE email = ?", (data.email,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user['is_verified']:
        conn.close()
        raise HTTPException(status_code=400, detail="Account not verified. Please verify your account first.")
    
    # Generate OTP for login
    otp = auth_service.generate_otp()
    otp_expires = int(time.time()) + OTP_EXPIRE_MINUTES * 60
    
    # Store login OTP (use separate fields to distinguish from registration OTP)
    cursor.execute(
        "UPDATE users SET login_otp = ?, login_otp_expires = ? WHERE id = ?",
        (otp, otp_expires, user['id'])
    )
    conn.commit()
    conn.close()
    
    # Send OTP email
    background_tasks.add_task(auth_service.send_otp_email, data.email, otp, is_login_otp=True)
    
    return {"message": "OTP sent to your email. Please verify to login.", "email": data.email}


@router.post("/login/verify-otp")
async def login_verify_otp(data: VerifyLoginOTP):
    """Verify OTP for login 2FA and return token."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id, name, role, login_otp, login_otp_expires, phone FROM users WHERE email = ?",
        (data.email,)
    )
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if login OTP exists
    if not user['login_otp']:
        conn.close()
        raise HTTPException(status_code=400, detail="No login OTP found. Please request a new OTP.")
    
    # Check OTP expiry
    if int(time.time()) > user['login_otp_expires']:
        conn.close()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")
    
    # Verify OTP
    if user['login_otp'] != data.otp:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Clear login OTP after successful verification
    cursor.execute(
        "UPDATE users SET login_otp = NULL, login_otp_expires = NULL WHERE id = ?",
        (user['id'],)
    )
    conn.commit()
    conn.close()
    
    # Generate JWT token
    access_token = auth_service.generate_access_token(user['id'], data.email)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": data.email,
            "role": user['role'],
            "phone": user.get('phone', '')
        }
    }


@router.post("/logout")
def logout():
    """Logout endpoint — frontend should clear token from localStorage."""
    # Server-side blacklisting would require a token store (Redis etc.)
    # For now, clients must clear the token; JTI-based blacklisting can be added later.
    return {"message": "Logged out successfully"}


# --- Profile endpoints ---
class UpdateProfileRequest(BaseModel):
    name: str | None = None
    phone: str | None = None

    @field_validator('name', 'phone')
    @classmethod
    def validate_fields(cls, v: str | None) -> str | None:
        if v:
            import re
            cleaned = re.sub(r'<script.*?>.*?</script>', '', v, flags=re.DOTALL | re.IGNORECASE)
            cleaned = re.sub(r'<[^>]*>', '', cleaned)
            return cleaned.strip()
        return v

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.get("/me")
async def get_current_user_info(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user information"""
    token = credentials.credentials
    try:
        user_data = auth_service.verify_access_token(token)
        user_id = user_data['user_id']
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, role, phone FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user['id'],
        "name": user['name'] or "Người dùng iEdu",
        "email": user['email'],
        "role": user['role'],
        "phone": user.get('phone') or ""
    }


@router.put("/profile")
async def update_profile(data: UpdateProfileRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update user profile"""
    token = credentials.credentials
    try:
        user_data = auth_service.verify_access_token(token)
        user_id = user_data['user_id']
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Build update query dynamically
    updates = []
    params = []
    if data.name is not None:
        updates.append("name = ?")
        params.append(data.name)
    if data.phone is not None:
        updates.append("phone = ?")
        params.append(data.phone)
    
    if not updates:
        conn.close()
        raise HTTPException(status_code=400, detail="No fields to update")
    
    params.append(user_id)
    
    try:
        cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
        
        # Fetch updated user
        cursor.execute("SELECT id, name, email, role, phone FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "role": user['role'],
            "phone": user.get('phone', '')
        }
    except HTTPException:
        raise
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logout")
def logout(authorization: str = Header(...)):
    """Invalidate the current access token."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization[7:]
    
    try:
        from jose import jwt
        payload = jwt.decode(token, auth_service.SECRET_KEY, algorithms=[auth_service.ALGORITHM])
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti:
            auth_service.blacklist_token(jti, exp)
            return {"message": "Logged out successfully"}
    except Exception:
        pass
        
    return {"message": "Logged out successfully (session ended)"}


@router.post("/change-password")
async def change_password(data: ChangePasswordRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Change user password"""
    token = credentials.credentials
@router.post("/change-password")
async def change_password(data: ResetPasswordRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Allow logged-in user to change their password. Revokes current token."""
    token = credentials.credentials
    conn = get_db()
    try:
        payload = auth_service.verify_access_token(token, conn=conn)
        if not payload:
            conn.close()
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user_id = payload["user_id"]
        cursor = conn.cursor()
        
        # Verify old password
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user or not auth_service.verify_password(data.reset_token, user["password_hash"]):
            # Note: Using reset_token field as old_password to reuse ResetPasswordRequest model
            conn.close()
            raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác")

        # Update to new password
        auth_service.validate_password_strength(data.new_password)
        hashed_password = auth_service.get_password_hash(data.new_password)
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hashed_password, user_id))
        
        # Revoke the current token
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti:
            auth_service.blacklist_token(jti, exp)
            
        conn.commit()
        conn.close()
        return {"message": "Đổi mật khẩu thành công. Phiên đăng nhập hiện tại đã được cập nhật."}
    except Exception as e:
        if conn:
            try: conn.close()
            except: pass
        if isinstance(e, HTTPException): raise e
        print(f"[AUTH ERROR] change_password: {e}")
        raise HTTPException(status_code=500, detail="Lỗi kết nối cơ sở dữ liệu")

@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Explicitly revoke the current access token."""
    token = credentials.credentials
    payload = auth_service.verify_access_token(token)
    if payload:
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti:
            auth_service.blacklist_token(jti, exp)
            return {"message": "Logged out successfully"}
    return {"message": "Already logged out or invalid token"}


@router.post("/resend-otp")
async def resend_otp(data: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    """Resend OTP to unverified user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, is_verified FROM users WHERE email = ?", (data.email,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return {"message": "If that email is registered, a new OTP has been sent."}

    if user['is_verified']:
        conn.close()
        return {"message": "Account already verified. Please login."}

    otp = auth_service.generate_otp()
    otp_expires = int(time.time()) + OTP_EXPIRE_MINUTES * 60
    cursor.execute(
        "UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?",
        (otp, otp_expires, user['id'])
    )
    conn.commit()
    conn.close()

    background_tasks.add_task(auth_service.send_otp_email, data.email, otp)
    return {"message": "If that email is registered, a new OTP has been sent."}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    """Send password reset email with reset token."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id, name FROM users WHERE email = ?", (data.email,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        # Don't reveal if email exists for security
        return {"message": "If email exists, password reset link has been sent."}

    # Generate reset token
    reset_token = auth_service.generate_reset_token()
    expires_at = int(time.time()) + 3600  # 1 hour

    try:
        cursor.execute(
            "UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?",
            (reset_token, expires_at, user['id'])
        )
        conn.commit()
        conn.close()

        # Send reset email asynchronously
        frontend_url = auth_service._get_setting("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        reset_link = f"{frontend_url}/reset-password?token={reset_token}&email={data.email}"
        background_tasks.add_task(
            auth_service.send_password_reset_email, data.email, reset_token, reset_link
        )

    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "If email exists, password reset link has been sent."}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    """Reset password using reset token from email."""
    try:
        auth_service.validate_password_strength(data.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, password_reset_token, password_reset_expires FROM users WHERE email = ?",
        (data.email,)
    )
    user = cursor.fetchone()

    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    if not user['password_reset_token']:
        conn.close()
        raise HTTPException(status_code=400, detail="No reset request found")

    if user['password_reset_token'] != data.reset_token:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid reset token")

    if int(time.time()) > user['password_reset_expires']:
        conn.close()
        raise HTTPException(status_code=400, detail="Reset token has expired")

    # Hash new password
    hashed_password = auth_service.get_password_hash(data.new_password)

    try:
        cursor.execute(
            "UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?",
            (hashed_password, user['id'])
        )
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))

    conn.close()
    return {"message": "Password reset successfully. You can now login."}


@router.post("/notify")
def send_notification(data: NotifyRequest, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Admin utility to send notifications manually (no auth check here, use admin router instead)."""
    background_tasks.add_task(
        auth_service.send_notification_email, data.email, data.title, data.message
    )
    return {"message": "Notification queued for delivery"}

from fastapi import APIRouter, HTTPException, Depends, status
import sqlite3
import time
from ..database import get_db, UserCreate
from ..services import auth_service
from ..services.auth_service import UserRegister, UserLogin, OTPVerify

router = APIRouter(prefix="/auth", tags=["Authentication"])

class ForgotPasswordRequest:
    def __init__(self, email: str):
        self.email = email

class ResetPasswordRequest:
    def __init__(self, email: str, reset_token: str, new_password: str):
        self.email = email
        self.reset_token = reset_token
        self.new_password = new_password

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister):
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

        cursor.execute(
            "INSERT INTO users (name, email, role, password_hash, otp, is_verified) VALUES (?, ?, ?, ?, ?, ?)",
            (user.name, user.email, user.role, hashed_password, otp, 0)       
        )
        conn.commit()

        # Send Email
        auth_service.send_otp_email(user.email, otp)
        
        conn.close()
        return {"message": "User registered. Please check email for OTP.", "email": user.email}

    except sqlite3.OperationalError as e:
        if 'conn' in locals() and conn: conn.close()
        raise HTTPException(status_code=500, detail=f"Database schema error: {e}. Please restart service to migrate.")
    except Exception as e:
        if 'conn' in locals() and conn: conn.close()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@router.post("/verify-otp")
async def verify_otp(data: OTPVerify):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, otp FROM users WHERE email = ?", (data.email,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    if user['otp'] != data.otp:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    # Activate user
    try:
        cursor.execute("UPDATE users SET is_verified = 1, otp = NULL WHERE id = ?", (user['id'],))
        conn.commit()
        
        # Send Welcome Email
        auth_service.send_welcome_email(data.email, user['name'])
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
        
    conn.close()
    return {"message": "Account verified successfully. You can now login."}

@router.post("/login")
async def login(data: UserLogin):
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT id, name, role, password_hash, is_verified FROM users WHERE email = ?", (data.email,))
        user = cursor.fetchone()
        conn.close()

        if not user:
            raise HTTPException(status_code=400, detail="User not found")

        if not auth_service.verify_password(data.password, user['password_hash']):
            raise HTTPException(status_code=400, detail="Incorrect password")     

        if not user['is_verified']:
            raise HTTPException(status_code=400, detail="Account not verified. Please verify OTP first.")

        # Generate JWT token
        access_token = auth_service.generate_access_token(user['id'], data.email) 

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": data.email,
                "role": user['role']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
def logout():
    """Logout endpoint - frontend should clear token from localStorage"""
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
def forgot_password(email: str):
    """
    Send password reset email with reset token.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name FROM users WHERE email = ?", (email,))
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
        
        # Send reset email
        reset_link = f"https://your-frontend-domain.com/reset-password?token={reset_token}&email={email}"
        auth_service.send_password_reset_email(email, reset_token, reset_link)
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    
    conn.close()
    return {"message": "If email exists, password reset link has been sent."}

@router.post("/reset-password")
def reset_password(email: str, reset_token: str, new_password: str):
    """
    Reset password using reset token from email.
    """
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id, password_reset_token, password_reset_expires FROM users WHERE email = ?",
        (email,)
    )
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user['password_reset_token']:
        conn.close()
        raise HTTPException(status_code=400, detail="No reset request found")
    
    if user['password_reset_token'] != reset_token:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid reset token")
    
    if int(time.time()) > user['password_reset_expires']:
        conn.close()
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Hash new password
    hashed_password = auth_service.get_password_hash(new_password)
    
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
def send_notification(email: str, title: str, message: str):
    """
    Admin utility to send notifications manually.
    """
    success = auth_service.send_notification_email(email, title, message)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")
    return {"message": "Notification sent"}

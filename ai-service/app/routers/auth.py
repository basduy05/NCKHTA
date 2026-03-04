from fastapi import APIRouter, HTTPException, Depends, status
import sqlite3
from ..database import get_db, UserCreate
from ..services import auth_service
from .auth_service import UserRegister, UserLogin, OTPVerify

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister):
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
    
    try:
        cursor.execute(
            "INSERT INTO users (name, email, role, password_hash, otp, is_verified) VALUES (?, ?, ?, ?, ?, ?)",
            (user.name, user.email, user.role, hashed_password, otp, 0)
        )
        conn.commit()
        
        # Send Email
        # Background task ideally, but doing sync here for simplicity as requested
        auth_service.send_otp_email(user.email, otp)
        
    except sqlite3.OperationalError as e:
        conn.close()
        # Fallback if DB schema is not updated yet (for old users)
        raise HTTPException(status_code=500, detail=f"Database schema error: {e}. Please restart service to migrate.")
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
        
    conn.close()
    return {"message": "User registered. Please check email for OTP.", "email": user.email}

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
        
    # Return mock token or user info session
    return {
        "access_token": f"mock-token-{user['id']}", 
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "name": user['name'],
            "role": user['role']
        }
    }

@router.post("/notify")
def send_notification(email: str, title: str, message: str):
    """
    Admin utility to send notifications manually.
    """
    success = auth_service.send_notification_email(email, title, message)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")
    return {"message": "Notification sent"}

from pydantic import BaseModel, EmailStr
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import random
import string
from passlib.context import CryptContext
import sqlite3
from jose import JWTError, jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- JWT CONFIG ---
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# --- ENV CONFIG ---
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", SMTP_USERNAME)

# --- MODELS ---
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "STUDENT"

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

# --- UTILS ---
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def generate_otp(length=6):
    return "".join(random.choices(string.digits, k=length))

def generate_access_token(user_id: int, email: str):
    """Create JWT access token"""
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_access_token(token: str):
    """Verify JWT and return user_id, email"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        email = payload.get("email")
        if user_id is None or email is None:
            return None
        return {"user_id": user_id, "email": email}
    except JWTError:
        return None

def generate_reset_token(length=32):
    """Generate random token for password reset"""
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))

def send_email(to_email: str, subject: str, html_content: str):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("SMTP credentials not configured. Email skipped.")
        return False
        
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=5)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False

# --- EMAIL TEMPLATES ---

def send_otp_email(to_email: str, otp_code: str):
    subject = "Verify your account - EAM System"
    html = f"""
    <html>
        <body>
            <h2>Welcome to EAM!</h2>
            <p>Your verification code is: <strong>{otp_code}</strong></p>
            <p>This code will expire in 10 minutes.</p>
        </body>
    </html>
    """
    return send_email(to_email, subject, html)

def send_welcome_email(to_email: str, name: str):
    subject = "Welcome to EAM System!"
    html = f"""
    <html>
        <body>
            <h2>Hello {name},</h2>
            <p>Welcome to our English Assessment & Management platform!</p>
            <p>Your account has been verified successfully. You can now log in and start learning.</p>
        </body>
    </html>
    """
    return send_email(to_email, subject, html)

def send_notification_email(to_email: str, title: str, message: str):
    subject = f"Notification: {title}"
    html = f"""
    <html>
        <body>
            <h3>{title}</h3>
            <p>{message}</p>
            <hr>
            <p>EAM System Notification</p>
        </body>
    </html>
    """
    return send_email(to_email, subject, html)

def send_password_reset_email(to_email: str, reset_token: str, reset_link: str):
    subject = "Password Reset Request - EAM System"
    html = f"""
    <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password (expires in 1 hour):</p>
            <p><a href="{reset_link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>Or use this code: <strong>{reset_token}</strong></p>
            <p>If you didn't request this, please ignore this email.</p>
        </body>
    </html>
    """
    return send_email(to_email, subject, html)

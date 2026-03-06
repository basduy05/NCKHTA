from pydantic import BaseModel, EmailStr
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import random
import string
import bcrypt
import sqlite3
from jose import JWTError, jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# --- Helper: read from DB settings first, then env ---
def _get_setting(key, default=None):
    try:
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        if row and row[0]:
            return row[0]
    except Exception:
        pass
    return os.getenv(key, default)

# --- JWT CONFIG ---
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

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
def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_byte_enc = plain_password.encode('utf-8')[:72]
    hashed_password_byte_enc = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_byte_enc)

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
    smtp_server = _get_setting("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(_get_setting("SMTP_PORT", "587"))
    smtp_username = _get_setting("SMTP_USERNAME")
    smtp_password = _get_setting("SMTP_PASSWORD")
    sender_email = _get_setting("SENDER_EMAIL", smtp_username)

    if not smtp_username or not smtp_password:
        print(f"SMTP credentials not configured. SMTP_USERNAME={smtp_username!r}, SMTP_PASSWORD={'***' if smtp_password else None}")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))

        print(f"Connecting to SMTP {smtp_server}:{smtp_port} as {smtp_username}...")
        try:
            # Try STARTTLS (port 587)
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=15)
            server.starttls()
        except Exception as e1:
            print(f"STARTTLS failed on port {smtp_port}: {e1}, trying SSL on 465...")
            server = smtplib.SMTP_SSL(smtp_server, 465, timeout=15)
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
        server.quit()
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {type(e).__name__}: {e}")
        return str(e)

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

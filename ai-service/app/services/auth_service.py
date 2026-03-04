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
from .database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
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

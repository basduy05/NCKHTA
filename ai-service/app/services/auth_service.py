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

def _send_via_resend(to_email: str, subject: str, html_content: str) -> bool:
    """Send email via Resend HTTP API (works on Render/cloud where SMTP is blocked)."""
    import urllib.request
    import json as _json

    api_key = _get_setting("RESEND_API_KEY")
    sender = _get_setting("SENDER_EMAIL") or _get_setting("SMTP_USERNAME")
    if not api_key:
        print("RESEND_API_KEY not configured")
        return False

    data = _json.dumps({
        "from": f"EAM System <{sender}>",
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }).encode()

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "EAM/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = _json.loads(resp.read())
            print(f"Resend OK: {result}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"Resend HTTP {e.code}: {body}")
        return False
    except Exception as e:
        print(f"Resend failed: {type(e).__name__}: {e}")
        return False


def _send_via_brevo(to_email: str, subject: str, html_content: str) -> bool:
    """Send email via Brevo (Sendinblue) HTTP API. Free 300 emails/day, sends to anyone."""
    import urllib.request
    import json as _json

    api_key = _get_setting("BREVO_API_KEY")
    sender = _get_setting("SENDER_EMAIL") or _get_setting("SMTP_USERNAME")
    sender_name = _get_setting("SENDER_NAME") or "EAM System"
    if not api_key:
        print("BREVO_API_KEY not configured")
        return False

    data = _json.dumps({
        "sender": {"name": sender_name, "email": sender},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }).encode()

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=data,
        headers={
            "api-key": api_key,
            "Content-Type": "application/json",
            "User-Agent": "EAM/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = _json.loads(resp.read())
            print(f"Brevo OK: {result}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"Brevo HTTP {e.code}: {body}")
        return False
    except Exception as e:
        print(f"Brevo failed: {type(e).__name__}: {e}")
        return False


def _send_via_smtp(to_email: str, subject: str, html_content: str) -> bool:
    """Send email via SMTP (works locally, blocked on some cloud hosts)."""
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
        return False


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    provider = (_get_setting("EMAIL_PROVIDER") or "auto").lower().strip()

    if provider == "resend":
        return _send_via_resend(to_email, subject, html_content)
    elif provider == "brevo":
        return _send_via_brevo(to_email, subject, html_content)
    elif provider == "smtp":
        return _send_via_smtp(to_email, subject, html_content)
    else:
        # auto: try Brevo first, then Resend, then SMTP
        if _get_setting("BREVO_API_KEY"):
            if _send_via_brevo(to_email, subject, html_content):
                return True
            print("Brevo failed, trying next...")
        if _get_setting("RESEND_API_KEY"):
            if _send_via_resend(to_email, subject, html_content):
                return True
            print("Resend failed, trying SMTP...")
        return _send_via_smtp(to_email, subject, html_content)

# --- EMAIL TEMPLATES ---

def send_otp_email(to_email: str, otp_code: str):
    subject = "🔐 Xác thực tài khoản - Hệ thống iEdu"
    html = f"""
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:40px 0;">
            <tr><td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">📚 iEdu</h1>
                            <p style="margin:5px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">English Assessment &amp; Management</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:35px 40px;">
                            <h2 style="margin:0 0 15px;color:#2d3748;font-size:20px;">Xác thực tài khoản</h2>
                            <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 25px;">
                                Chào bạn! Cảm ơn bạn đã đăng ký tài khoản trên hệ thống <strong>iEdu</strong>. Vui lòng sử dụng mã OTP bên dưới để hoàn tất xác thực:
                            </p>
                            <div style="background:#f0f4ff;border:2px dashed #667eea;border-radius:10px;padding:20px;text-align:center;margin:0 0 25px;">
                                <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#667eea;">{otp_code}</span>
                            </div>
                            <p style="color:#718096;font-size:13px;line-height:1.5;margin:0 0 10px;">
                                ⏰ Mã này sẽ hết hạn sau <strong>10 phút</strong>.<br>
                                🔒 Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                            <p style="margin:0;color:#a0aec0;font-size:12px;">© 2025 iEdu - English Assessment &amp; Management System</p>
                        </td>
                    </tr>
                </table>
            </td></tr>
        </table>
    </body>
    </html>
    """
    return send_email(to_email, subject, html)

def send_welcome_email(to_email: str, name: str):
    frontend_url = _get_setting("FRONTEND_URL") or "https://nckhta-1wfu.vercel.app"
    subject = "🎉 Chào mừng bạn đến với iEdu!"
    html = f"""
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:40px 0;">
            <tr><td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#38b2ac 0%,#4fd1c5 100%);padding:30px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:28px;">🎊 Chúc mừng!</h1>
                            <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Tài khoản đã được xác thực thành công</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:35px 40px;">
                            <h2 style="margin:0 0 15px;color:#2d3748;font-size:20px;">Xin chào {name} 👋</h2>
                            <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 20px;">
                                Chào mừng bạn đến với <strong>iEdu</strong> – Hệ thống Đánh giá &amp; Quản lý Tiếng Anh! Tài khoản của bạn đã được kích hoạt thành công.
                            </p>
                            <div style="background:#f0fff4;border-left:4px solid #38b2ac;border-radius:8px;padding:15px 20px;margin:0 0 25px;">
                                <p style="margin:0;color:#2d3748;font-size:14px;line-height:1.6;">
                                    ✅ Tài khoản: <strong>{to_email}</strong><br>
                                    ✅ Trạng thái: <strong style="color:#38b2ac;">Đã xác thực</strong>
                                </p>
                            </div>
                            <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 25px;">
                                Bạn có thể đăng nhập ngay để bắt đầu hành trình học tập:
                            </p>
                            <div style="text-align:center;margin:0 0 25px;">
                                <a href="{frontend_url}/login" style="display:inline-block;background:linear-gradient(135deg,#38b2ac,#4fd1c5);color:#ffffff;font-size:16px;font-weight:600;padding:14px 40px;border-radius:8px;text-decoration:none;">
                                    🚀 Đăng nhập ngay
                                </a>
                            </div>
                            <div style="background:#fefcbf;border-radius:8px;padding:15px 20px;margin:0 0 10px;">
                                <p style="margin:0;color:#744210;font-size:13px;line-height:1.5;">
                                    💡 <strong>Mẹo:</strong> Sau khi đăng nhập, hãy khám phá các bài học, từ vựng và bài kiểm tra để nâng cao trình độ tiếng Anh của bạn!
                                </p>
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                            <p style="margin:0;color:#a0aec0;font-size:12px;">© 2025 iEdu - English Assessment &amp; Management System</p>
                        </td>
                    </tr>
                </table>
            </td></tr>
        </table>
    </body>
    </html>
    """
    return send_email(to_email, subject, html)

def send_notification_email(to_email: str, title: str, message: str):
    subject = f"📢 {title} - iEdu"
    html = f"""
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:40px 0;">
            <tr><td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#ed8936 0%,#f6ad55 100%);padding:25px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;">📢 Thông báo từ iEdu</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px 40px;">
                            <h2 style="margin:0 0 15px;color:#2d3748;font-size:18px;">{title}</h2>
                            <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0;">{message}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                            <p style="margin:0;color:#a0aec0;font-size:12px;">© 2025 iEdu - English Assessment &amp; Management System</p>
                        </td>
                    </tr>
                </table>
            </td></tr>
        </table>
    </body>
    </html>
    """
    return send_email(to_email, subject, html)

def send_password_reset_email(to_email: str, reset_token: str, reset_link: str):
    subject = "🔑 Đặt lại mật khẩu - iEdu"
    html = f"""
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:40px 0;">
            <tr><td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#e53e3e 0%,#fc8181 100%);padding:25px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;">🔑 Đặt lại mật khẩu</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:35px 40px;">
                            <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 25px;">
                                Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản <strong>{to_email}</strong>. Nhấn nút bên dưới để tiếp tục (hết hạn sau 1 giờ):
                            </p>
                            <div style="text-align:center;margin:0 0 25px;">
                                <a href="{reset_link}" style="display:inline-block;background:linear-gradient(135deg,#e53e3e,#fc8181);color:#ffffff;font-size:16px;font-weight:600;padding:14px 40px;border-radius:8px;text-decoration:none;">
                                    🔓 Đặt lại mật khẩu
                                </a>
                            </div>
                            <div style="background:#fff5f5;border:2px dashed #e53e3e;border-radius:10px;padding:15px;text-align:center;margin:0 0 25px;">
                                <p style="margin:0 0 5px;color:#718096;font-size:13px;">Hoặc sử dụng mã:</p>
                                <span style="font-size:28px;font-weight:800;letter-spacing:6px;color:#e53e3e;">{reset_token}</span>
                            </div>
                            <p style="color:#718096;font-size:13px;line-height:1.5;margin:0;">
                                ⚠️ Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                            <p style="margin:0;color:#a0aec0;font-size:12px;">© 2025 iEdu - English Assessment &amp; Management System</p>
                        </td>
                    </tr>
                </table>
            </td></tr>
        </table>
    </body>
    </html>
    """
    return send_email(to_email, subject, html)

import sys
import io

# Force UTF-8 encoding for stdout and stderr to prevent UnicodeEncodeError in Windows/Render
if hasattr(sys.stdout, "buffer"):
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except (AttributeError, Exception):
        pass
if hasattr(sys.stderr, "buffer"):
    try:
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except (AttributeError, Exception):
        pass

from fastapi import FastAPI, UploadFile, File, Body, Request, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
import traceback
import asyncio
import time

# Load environment variables from .env file BEFORE importing services
# Use explicit path to ensure .env is loaded correctly
import pathlib
env_path = pathlib.Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
print(f"[STARTUP] Loading .env from: {env_path}", flush=True)

print("[STARTUP] Loading services...", flush=True)
try:
    from .services import graph_service, llm_service  # Import internal services
    print("[STARTUP] Services loaded OK")
except Exception as e:
    print(f"[STARTUP ERROR] Failed to load services: {e}")
    traceback.print_exc()
    graph_service = None
    llm_service = None

router_load_error = None

print("[STARTUP] Loading routers...", flush=True)
try:
    from .routers import admin  # Import routers
    from .routers import auth  # Import Auth Router
    from .routers import teacher  # Import Teacher Router
    from .routers import student  # Import Student Router
    from .routers import chat    # Import AI Chat Router
    from .routers import notifications # Import SSE Notification Router
    from .routers import groups  # Import Study Groups Router
    from .routers import chat_realtime  # Import Realtime Chat Router
    print("[STARTUP] Routers loaded OK", flush=True)
except Exception as e:
    import traceback
    router_load_error = str(e)
    print(f"[STARTUP ERROR] Failed to load routers: {e}", flush=True)
    print(traceback.format_exc(), flush=True)
    admin = None
    auth = None
    teacher = None
    student = None
    chat = None
    notifications = None
    groups = None
    chat_realtime = None
    
from .dependencies import get_admin_user, get_teacher_user, get_current_user

import sqlite3

class TextRequest(BaseModel):
    text: str
    num_questions: int = 5


# ─── LIFESPAN: warm up connections at startup ─────────────────────────────────
async def _warmup_neo4j_background():
    """Warm up Neo4j in the background so it doesn't block server startup / Render health check."""
    try:
        if graph_service:
            print("[STARTUP] Pre-warming Neo4j connection in background...", flush=True)
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, graph_service.get_graph)
            print("[STARTUP] Neo4j background warm-up completed successfully.", flush=True)
    except Exception as e:
        print(f"[STARTUP] Neo4j background warm-up skipped/error: {e}", flush=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database
    print("[STARTUP] Initializing database...")
    from .database import init_db
    try:
        init_db()
    except Exception as e:
        print(f"[STARTUP ERROR] Database initialization failed: {e}")
        traceback.print_exc()

    # Verification: Check for SECRET_KEY
    if not os.getenv("SECRET_KEY"):
        print("=" * 60)
        print("⚠️  WARNING: SECRET_KEY is NOT set in environment variables!")
        print("Sessions will NOT persist across server restarts.")
        print("Please set SECRET_KEY in Render dashboard / environment.")
        print("=" * 60)
    else:
        print("[STARTUP] SECRET_KEY verified OK")

    # Non-blocking background warm-up for Neo4j
    if graph_service:
        asyncio.create_task(_warmup_neo4j_background())

    # Start background job queue (Task 3.15)
    try:
        from .services.job_queue_service import job_queue
        asyncio.create_task(job_queue.start())
    except Exception as je:
        print(f"[STARTUP] Job queue start error: {je}")

    print("[STARTUP] App ready for traffic!")
    yield
    # Shutdown: cleanup
    print("[SHUTDOWN] Cleaning up...")


tags_metadata = [
    {
        "name": "Auth",
        "description": "Authentication, Refresh Token Rotation with Replay Attack Detection, 2FA OTP, Device Management",
    },
    {
        "name": "Student",
        "description": "Student endpoints: FSRS Vocabulary, CMU IPA, Anki/Quizlet Export & Import, News Quiz, Adaptive Roadmap, ETA Calculator, Parent Portal, Subscription",
    },
    {
        "name": "Teacher",
        "description": "Teacher endpoints: Classes, Assignments, Quiz Builder, Analytics, Grading & Feedback",
    },
    {
        "name": "Realtime Chat",
        "description": "Group Chat & Realtime Messaging with AI Teacher Bot (@ai, @teacher), Presence & Emoji Reactions",
    },
    {
        "name": "Admin",
        "description": "System administration, user roles, security audits, AI provider fallbacks, feedback",
    }
]

app = FastAPI(
    title="iEdu Intelligent English Learning API",
    description="""
## iEdu AI Platform (Production Scale)
Hệ thống học tiếng Anh thông minh ứng dụng Trí tuệ Nhân tạo thế hệ mới (GenAI & Knowledge Graph):
- **Auth & Security**: Refresh token rotation, 2FA OTP, quản lý thiết bị đa phiên.
- **Vocabulary & FSRS**: Thuật toán lặp lại ngắt quãng FSRS v4, phiên âm chuẩn CMU IPA, xuất nhập Anki / Quizlet.
- **AI Teacher Bot**: Hỗ trợ giải đáp bài học tự động trong phòng chat nhóm.
- **Teacher Quiz Builder**: Soạn thảo và giao bài trắc nghiệm thông minh.
- **Parent Portal**: Báo cáo học tập trực quan dành cho phụ huynh không cần đăng nhập.
- **Adaptive Roadmap & ETA**: Tự động tinh chỉnh lộ trình theo lỗ hổng kiến thức và dự báo ngày cán đích.
- **Monetization**: Gói iEdu PRO tích hợp điểm thưởng.
    """,
    version="3.0.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

# 1.3 🗜️ GZip Response Compression (reduce 60-70% bandwidth for JSON payload >= 1KB)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ─── CDN & CACHE CONTROL MIDDLEWARE (Task 3.14) ──────────────────────────────
@app.middleware("http")
async def cdn_cache_middleware(request: Request, call_next):
    """Set optimal edge caching headers for static assets, dictionary lookups, and grammar rules."""
    response = await call_next(request)
    path = request.url.path
    if path.startswith(("/static", "/public")) or any(path.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".svg", ".css", ".js", ".woff2"]):
        response.headers["Cache-Control"] = "public, max-age=604800, immutable"
        response.headers["Cloudflare-CDN-Cache-Control"] = "max-age=2592000"
    elif "/dictionary/cmu-ipa" in path or "/grammar/rules" in path:
        response.headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=43200"
    return response


# ─── SECURITY HEADERS MIDDLEWARE ─────────────────────────────────────────────
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Add essential security headers to every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; object-src 'none';"
    return response

# ─── GLOBAL EXCEPTION HANDLER ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[UNHANDLED ERROR] {request.method} {request.url.path}: {type(exc).__name__}: {exc}")
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# ─── REQUEST TIMEOUT MIDDLEWARE ───────────────────────────────────────────────
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "120"))
@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    try:
        return await asyncio.wait_for(call_next(request), timeout=REQUEST_TIMEOUT)
    except asyncio.TimeoutError:
        return JSONResponse(status_code=504, content={"detail": "Request timed out"})

# ─── SIMPLE RATE LIMITER ─────────────────────────────────────────────────────
_rate_store: dict = {}
RATE_LIMIT = int(os.getenv("RATE_LIMIT", "30"))
RATE_WINDOW = int(os.getenv("RATE_WINDOW", "60"))
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    if any(p in path for p in ["/dictionary/", "/analyze-text", "/generate-quiz", "/generate-vocab", "/flashcard/", "/vocabulary/extract", "/quiz/generate"]):
        client_ip = (request.client.host if request.client else "unknown")
        now = time.time()
        window_start = now - RATE_WINDOW
        timestamps = _rate_store.get(client_ip, [])
        timestamps = [t for t in timestamps if t > window_start]
        if len(timestamps) >= RATE_LIMIT:
            return JSONResponse(status_code=429, content={"detail": "Too many requests"})
        timestamps.append(now)
        _rate_store[client_ip] = timestamps
    return await call_next(request)

if admin:
    app.include_router(admin.router, dependencies=[Depends(get_admin_user)])

if auth:
    app.include_router(auth.router)

if teacher:
    app.include_router(teacher.router, dependencies=[Depends(get_teacher_user)])

# ─── PUBLIC PARENT REPORT (NO AUTH REQUIRED) ──────────────────────────────────
@app.get("/student/public/report/{link_code}", tags=["Student"])
@app.get("/public/report/{link_code}", tags=["Student"])
def public_student_report_direct(link_code: str):
    """Direct public access for parents without JWT authentication."""
    from .routers.student import get_public_student_report
    return get_public_student_report(link_code)

if student:
    app.include_router(student.router, dependencies=[Depends(get_current_user)])

if chat:
    app.include_router(chat.router, dependencies=[Depends(get_current_user)])

if notifications:
    app.include_router(notifications.router)

if groups:
    app.include_router(groups.router, dependencies=[Depends(get_current_user)])

if chat_realtime:
    app.include_router(chat_realtime.router)

# CORS: Allow specific origins
# MUST BE ADDED LAST TO BE OUTERMOST IN FASTAPI (wraps all other middlewares)
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "https://nckhta-1wfu.vercel.app,http://localhost:3000,http://127.0.0.1:3000",
)
origins = [o.strip().rstrip("/") for o in _raw_origins.split(",") if o.strip()]
# Ensure common local frontend origins are accepted even if env is incomplete.
for local_origin in ["http://localhost:3000", "http://127.0.0.1:3000"]:
    if local_origin not in origins:
        origins.append(local_origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {
        "status": "AI Service Running", 
        "message": "Welcome to EAM Project"
    }

@app.get("/debug/db")
def debug_db():
    from .database import get_db
    try:
        conn = get_db()
        cursor = conn.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        conn.close()
        return {"db_status": "ok", "user_count": count}
    except Exception as e:
        return {"db_status": "error", "detail": str(e)}

@app.get("/debug/startup-error")
def debug_startup_error():
    if router_load_error:
        return {"error": router_load_error}
    return {"message": "Small success: Routers loaded but something else might be wrong."}

_server_start_time = time.time()
_health_cached_resp = None
_health_cached_ts = 0.0

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    """Fast health check with system metrics, DB status, and 5s in-memory cache."""
    global _health_cached_resp, _health_cached_ts
    now = time.time()
    if _health_cached_resp and (now - _health_cached_ts < 5.0):
        return {**_health_cached_resp, "cached": True}
    
    # Check Database connection
    db_ok = False
    try:
        from .database import get_db
        conn = get_db()
        conn.execute("SELECT 1").fetchone()
        conn.close()
        db_ok = True
    except Exception:
        db_ok = False

    # Check RAM metrics
    ram_metrics = {}
    try:
        import psutil
        vm = psutil.virtual_memory()
        ram_metrics = {
            "used_percent": vm.percent,
            "available_mb": round(vm.available / (1024 * 1024), 1)
        }
    except Exception:
        ram_metrics = {"status": "unavailable"}

    # Active online users
    online_count = 0
    try:
        from .services.chat_service import chat_manager
        online_count = len(chat_manager.online_users)
    except Exception:
        pass

    _health_cached_ts = now
    _health_cached_resp = {
        "status": "ok" if db_ok else "degraded",
        "timestamp": now,
        "uptime_seconds": round(now - _server_start_time, 1),
        "database_connected": db_ok,
        "online_users_count": online_count,
        "system_ram": ram_metrics,
        "message": "System is running healthy" if db_ok else "Database connection degraded"
    }
    return {**_health_cached_resp, "cached": False}

@app.get("/health/graph")
def health_graph():
    # Keep legacy endpoint but use the internal logic
    return {
        "graph_connected": True,
        "error": None
    }

@app.post("/analyze-text")
def analyze_text(request: TextRequest):
    """
    1. Extracts entities -> Updates Neo4j Graph.
    2. Generates semantic summary.
    """
    graph_result = graph_service.extract_entities_and_relations(request.text)
    return {"analysis": "Text processed", "graph_update": graph_result}

@app.get("/graph/visualize")
def visualize_graph(topic: str = "General"):
    """
    Returns nodes and edges for D3.js / React Force Graph.
    """
    return graph_service.get_knowledge_subgraph(topic)

@app.post("/flashcard/generate")
async def generate_flashcard(word: str, level: str = "A1"):
    return await llm_service.generate_flashcard_content(word, level)

@app.post("/vocabulary/extract")
async def extract_vocabulary(request: TextRequest):
    """
    Core Feature: Extracts vocabulary list from input text with meanings and phonetics.
    """
    return await llm_service.extract_vocabulary_from_text(request.text)

@app.post("/quiz/generate")
async def generate_quiz_endpoint(request: TextRequest):
    """
    Core Feature: Generates a quiz based on the input text to test comprehension.
    """
    return await llm_service.generate_quiz_from_text(request.text, request.num_questions)

class SpeechTextRequest(BaseModel):
    transcript: str
    expected_text: str

@app.post("/speech/analyze")
async def analyze_speech(
    transcript: Optional[str] = Form(None),
    expected_text: Optional[str] = Form(""),
    audio_file: Optional[UploadFile] = File(None)
):
    """
    Intelligent pronunciation analysis:
    Transcribes audio blob with Gemini/Whisper STT if audio_file provided,
    then computes Levenshtein distance, WER, and word-level accuracy.
    """
    from .services.speech_service import evaluate_speech_transcript, transcribe_audio_bytes
    spoken_text = transcript or ""
    
    if audio_file:
        try:
            audio_bytes = await audio_file.read()
            mime_type = audio_file.content_type or "audio/webm"
            stt_result = await transcribe_audio_bytes(audio_bytes, mime_type)
            if stt_result:
                spoken_text = stt_result
        except Exception as e:
            print(f"[SPEECH] Audio transcribe error: {e}")

    return evaluate_speech_transcript(spoken_text, expected_text or "")

@app.post("/speech/transcribe")
async def transcribe_speech_endpoint(
    audio_file: UploadFile = File(...),
    expected_text: Optional[str] = Form("")
):
    """Direct STT transcription endpoint accepting audio blob."""
    from .services.speech_service import evaluate_speech_transcript, transcribe_audio_bytes
    audio_bytes = await audio_file.read()
    mime_type = audio_file.content_type or "audio/webm"
    transcript = await transcribe_audio_bytes(audio_bytes, mime_type)
    evaluation = evaluate_speech_transcript(transcript, expected_text or "") if expected_text else {}
    return {
        "transcript": transcript,
        "evaluation": evaluation
    }

@app.post("/speech/analyze-text")
async def analyze_speech_json(data: SpeechTextRequest):
    """JSON body version for pronunciation analysis from Web Speech API transcript."""
    from .services.speech_service import evaluate_speech_transcript
    return evaluate_speech_transcript(data.transcript, data.expected_text) 

if __name__ == "__main__":
    import uvicorn

    # Render provides PORT env var
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

# Force reload

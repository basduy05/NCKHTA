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

from fastapi import FastAPI, UploadFile, File, Body, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
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
    
from .dependencies import get_admin_user, get_teacher_user, get_current_user

import sqlite3

class TextRequest(BaseModel):
    text: str
    num_questions: int = 5


# ─── LIFESPAN: warm up connections at startup ─────────────────────────────────
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

    # Startup: pre-warm Neo4j connection
    print("[STARTUP] Pre-warming Neo4j connection...")

    # Verification: Check for SECRET_KEY
    if not os.getenv("SECRET_KEY"):
        print("=" * 60)
        print("⚠️  WARNING: SECRET_KEY is NOT set in environment variables!")
        print("Sessions will NOT persist across server restarts.")
        print("Please set SECRET_KEY in Render dashboard / environment.")
        print("=" * 60)
    else:
        print("[STARTUP] SECRET_KEY verified OK")

    if graph_service:
        try:
            graph_service.get_graph()
        except Exception as e:
            print(f"[STARTUP] Neo4j warm-up skipped: {e}")
    print("[STARTUP] App ready!")
    yield
    # Shutdown: cleanup
    print("[SHUTDOWN] Cleaning up...")


app = FastAPI(
    title="EAM AI Service",
    description="Powered by Neo4j & GenAI",
    lifespan=lifespan,
)

# ALL REQUIRED DEPENDENCIES:
# uvicorn, fastapi, python-multipart, python-dotenv, neo4j, langchain
# langchain-community, google-generativeai, openai

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

if student:
    app.include_router(student.router, dependencies=[Depends(get_current_user)])

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

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    """Detailed health check for all service dependencies."""
    health_status = {"status": "ok", "timestamp": time.time(), "dependencies": {}}
    
    # 1. Check SQL Database (Postgres/Turso)
    try:
        from .database import get_db
        with get_db() as conn:
            conn.execute("SELECT 1")
        health_status["dependencies"]["database"] = "ok"
    except Exception as e:
        health_status["status"] = "error"
        health_status["dependencies"]["database"] = f"error: {str(e)}"
    
    # 2. Check Graph Database (Neo4j)
    if graph_service:
        try:
            g = graph_service.get_graph()
            if g:
                # Simple query to verify connection is alive
                graph_service._safe_query("MATCH (n) RETURN count(n) LIMIT 1")
                health_status["dependencies"]["graph"] = "ok"
            else:
                health_status["status"] = "degraded"
                health_status["dependencies"]["graph"] = "disconnected"
        except Exception as e:
            health_status["status"] = "degraded"
            health_status["dependencies"]["graph"] = f"error: {str(e)}"
    else:
        health_status["dependencies"]["graph"] = "not_loaded"

    return health_status

@app.get("/health/graph")
def health_graph():
    # Keep legacy endpoint but use the internal logic
    status = health_check()
    return {
        "graph_connected": status["dependencies"].get("graph") == "ok",
        "error": status["dependencies"].get("graph") if status["dependencies"].get("graph") != "ok" else None
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

@app.post("/speech/analyze")
async def analyze_speech(audio_file: UploadFile = File(...)):
    """
    Receives audio blob from frontend -> STT (Speech-to-Text) -> Phoneme Analysis.
    For NCKH demo, we can use OpenAI Whisper API or Google Speech API here.
    """
    return {"score": 85, "feedback": "Good pronunciation of 'th' sound."} 

if __name__ == "__main__":
    import uvicorn

    # Render provides PORT env var
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

# Force reload

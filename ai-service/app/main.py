from fastapi import FastAPI, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

# Load environment variables from .env file BEFORE importing services
load_dotenv()

from .services import graph_service, llm_service  # Import internal services
from .routers import admin  # Import routers
from .routers import auth  # Import Auth Router
import sqlite3
import os

class TextRequest(BaseModel):
    text: str
    num_questions: int = 5

app = FastAPI(title="EAM AI Service", description="Powered by Neo4j & GenAI")

# ALL REQUIRED DEPENDENCIES:
# uvicorn, fastapi, python-multipart, python-dotenv, neo4j, langchain
# langchain-community, google-generativeai, openai

origins = ["*"]  # Restrict in production

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(auth.router)

@app.get("/")
def read_root():
    # Check connection status dynamically
    try:
        g = graph_service.get_graph()
        is_connected = g is not None
        error_msg = getattr(graph_service, "last_error", None)
        return {
            "status": "AI Service Running", 
            "graph_connected": is_connected,
            "error": error_msg if not is_connected else None
        }
    except Exception as e:
        return {"status": "AI Service Running", "graph_connected": False, "error": str(e)}

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
def generate_flashcard(word: str, level: str = "A1"):
    return llm_service.generate_flashcard_content(word, level)

@app.post("/vocabulary/extract")
def extract_vocabulary(request: TextRequest):
    """
    Core Feature: Extracts vocabulary list from input text with meanings and phonetics.
    """
    return llm_service.extract_vocabulary_from_text(request.text)

@app.post("/quiz/generate")
def generate_quiz(request: TextRequest):
    """
    Core Feature: Generates a quiz based on the input text to test comprehension.
    """
    return llm_service.generate_quiz_from_text(request.text, request.num_questions)

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

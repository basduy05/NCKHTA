from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Allow CORS for frontend
origins = [
    "*", # Allow all for now, restrict in production to frontend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "AI Service is running on Render!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Example endpoint to interact with Neo4j (GraphRAG placeholder)
@app.post("/analyze-text")
def analyze_text(text: str):
    # Logic to process text with LangChain/Neo4j would go here
    return {"analysis": f"Processed text: {text[:50]}...", "graph_nodes": []}

if __name__ == "__main__":
    import uvicorn
    # Render provides PORT env var
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
import os
import json

def parse_json_response(text: str):
    try:
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print("JSON parse error:", e)
        return []

# Placeholder for API Keys (Set in environment variables)
# os.environ["GOOGLE_API_KEY"] = "YOUR_GEMINI_KEY"
# os.environ["OPENAI_API_KEY"] = "YOUR_OPENAI_KEY"

def get_llm():
    """
    Factory to return the configured LLM instance.
    Prefers Gemini (often free tier available) or OpenAI.
    """
    google_key = os.environ.get("GOOGLE_API_KEY", "AIzaSyBx_1S1HnKt9sHNhEBuGWO50scGDKm0_Oo")
    os.environ["GOOGLE_API_KEY"] = google_key # Set it for langchain to pick up
    if google_key:
        return ChatGoogleGenerativeAI(model="models/gemini-2.5-flash")
    elif os.environ.get("OPENAI_API_KEY"):
        return ChatOpenAI(model="gpt-3.5-turbo")
    else:
        # Fallback for dev if no keys (Mock)
        return None

def generate_flashcard_content(word: str, level: str = "A1"):
    llm = get_llm()
    if not llm:
        return {
            "word": word,
            "definition": "Definition not available (Configure API Key)",
            "example": "Example not available"
        }
        
    prompt = PromptTemplate.from_template(
        "Generate a flashcard for the English word '{word}' suitable for level '{level}'. "
        "Return strictly JSON format with keys: definition, example, synonym, antonym."
    )
    
    chain = prompt | llm
    response = chain.invoke({"word": word, "level": level})
    return response.content

def extract_vocabulary_from_text(text: str):
    """
    Uses LLM to analyse text and extract key vocabulary words with metadata.
    Essential for the 'Input Text -> Learn' feature.
    """
    llm = get_llm()
    if not llm:
        return [{"word": "Error", "meaning": "LLM not configured"}]
        
    prompt = PromptTemplate.from_template(
        "Analyze the following text and extract 5-10 key English vocabulary words suitable for learning. "
        "For each word, provide: phonetic, part of speech, Vietnamese meaning, and English definition. "
        "Text: {text} \n"
        "Return strictly a JSON list of objects."
    )
    
    chain = prompt | llm
    response = chain.invoke({"text": text})
    return parse_json_response(response.content)

def generate_quiz_from_text(text: str, num_questions: int = 5):
    """
    Generates dynamic Multiple Choice Questions based on the specific text context.
    """
    llm = get_llm()
    if not llm:
        return []
        
    prompt = PromptTemplate.from_template(
        "Generate {num} multiple-choice questions based on the vocabulary and context of this text: "
        "'{text}'. \n"
        "Return strictly a JSON list where each object has: 'question', 'options' (list of 4), and 'correct_answer'."
    )
    
    chain = prompt | llm
    response = chain.invoke({"text": text, "num": num_questions})
    return parse_json_response(response.content)

def generate_example_sentence(word: str, meaning: str = "", level: str = "B1"):
    llm = get_llm()
    if not llm:
        return f"Example for {word} (Auto-generated placeholder)"
        
    prompt = PromptTemplate.from_template(
        "Generate a short, clear English example sentence for the word '{word}' (meaning: '{meaning}') at CEFR level {level}. Return ONLY the sentence text, no quotes."
    )
    
    chain = prompt | llm
    try:
        response = chain.invoke({"word": word, "meaning": meaning, "level": level})
        return response.content
    except Exception as e:
        print(f"LLM Error: {e}")
        return f"This is an example sentence for {word}."


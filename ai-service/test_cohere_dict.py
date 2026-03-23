import os
import sys
import asyncio
from dotenv import load_dotenv

# Add app directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.llm_service import get_llm, translate_meanings_with_ai

def test_cohere_dict():
    load_dotenv()
    print("Testing Cohere with dictionary prompt...")
    # Mock meanings from Free Dictionary API for "serendipity"
    mock_meanings = [
        {"pos": "noun", "definition_en": "The occurrence and development of events by chance in a happy or beneficial way."}
    ]
    try:
        res = translate_meanings_with_ai("serendipity", mock_meanings)
        print(f"Result: {str(res)[:200]}...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_cohere_dict()

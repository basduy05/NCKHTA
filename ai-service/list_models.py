import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    from app.services import llm_service
    api_key = llm_service._get_setting("GOOGLE_API_KEY")

if api_key:
    genai.configure(api_key=api_key)
    print("Listing models:")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(m.name)
    except Exception as e:
        print(f"Error listing models: {e}")
else:
    print("No API Key found")

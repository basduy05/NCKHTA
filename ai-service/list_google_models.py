import google.generativeai as genai
import os
import sys
from app.services.llm_service import _get_setting

key = _get_setting("GOOGLE_API_KEY")
if not key:
    print("No Google API Key found")
    sys.exit(1)

genai.configure(api_key=key)

print("Listing Google models:")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"Error listing Google models: {e}")

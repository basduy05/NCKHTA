import cohere
import os
from dotenv import load_dotenv

load_dotenv()

co = cohere.Client(api_key=os.getenv("COHERE_API_KEY"))

try:
    models = co.models.list()
    print("Available Cohere models:")
    for m in models.models:
        print(f"{m.name} - {m.endpoints}")
except Exception as e:
    print(f"Error listing Cohere models: {e}")

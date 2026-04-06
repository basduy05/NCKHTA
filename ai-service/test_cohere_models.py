import os
import cohere
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("COHERE_API_KEY")
if not api_key:
    print("No COHERE_API_KEY found")
    exit(1)

try:
    co = cohere.Client(api_key)
    # Get all models - note this is a more modern way
    models = co.models.list()
    print("Listing available Cohere models...")
    for m in models:
        print(f"Model ID: {m.name}")
except Exception as e:
    print(f"Error listing Cohere models: {e}")

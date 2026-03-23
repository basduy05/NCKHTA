import asyncio
import os
import sys
import json
from dotenv import load_dotenv

# Add app directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.llm_service import lookup_dictionary_stream

async def test_stream(word):
    print(f"Testing streaming lookup for: {word}")
    async for chunk in lookup_dictionary_stream(word):
        print(f"CHUNK: {chunk}")

if __name__ == "__main__":
    load_dotenv()
    word = sys.argv[1] if len(sys.argv) > 1 else "persist"
    asyncio.run(test_stream(word))

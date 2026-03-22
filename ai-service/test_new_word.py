import asyncio
import sys
import os

# Add the app directory to sys.path
sys.path.append(os.getcwd())

from app.services import llm_service

async def test_lookup():
    word = "resilience" # A word that might not be in the cache
    print(f"Testing lookup for word: {word}")
    
    count = 0
    try:
        async for chunk in llm_service.lookup_dictionary_stream(word):
            count += 1
            print(f"Chunk {count}: {chunk[:100]}...")
            if "error" in chunk.lower():
                print(f"ERROR found in chunk: {chunk}")
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    asyncio.run(test_lookup())

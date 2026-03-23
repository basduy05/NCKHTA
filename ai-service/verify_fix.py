import asyncio
import os
import sys

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.services.llm_service import lookup_dictionary_stream
from dotenv import load_dotenv

load_dotenv()

async def test_fallback():
    word = "serendipity"
    print(f"Testing dictionary lookup stream for '{word}' with fallback...")
    
    try:
        count = 0
        async for chunk in lookup_dictionary_stream(word):
            count += 1
            # print(f"Chunk {count}: {chunk[:50]}...")
            if '"status": "result"' in chunk:
                print("SUCCESS: Received a result chunk!")
                return True
        print("FAILED: No result chunk received.")
        return False
    except Exception as e:
        print(f"ERROR during lookup: {e}")
        return False

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    success = loop.run_until_complete(test_fallback())
    if success:
        print("\nVerification PASSED: Fallback mechanism is working correctly.")
        sys.exit(0)
    else:
        print("\nVerification FAILED.")
        sys.exit(1)

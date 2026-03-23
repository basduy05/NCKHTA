import asyncio
import os
import sys
import json

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.services.llm_service import lookup_dictionary_stream
from dotenv import load_dotenv

load_dotenv()

async def test_trimmer():
    word = "trimmer"
    print(f"Testing dictionary lookup stream for '{word}'...")
    
    try:
        found_data = False
        async for chunk in lookup_dictionary_stream(word):
            print(f"CHUNK: {chunk}")
            if '"meanings": [' in chunk:
                found_data = True
        
        if found_data:
            print("\nSUCCESS: Meanings found in stream.")
        else:
            print("\nFAILURE: No meanings found in stream.")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(test_trimmer())

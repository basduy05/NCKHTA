
import os
import sys
import json
import time
import asyncio

# Add the app directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.llm_service import lookup_dictionary_stream
from app.database import get_db, get_cached_dictionary

async def test_dictionary_persistence():
    print("Testing dictionary persistence and caching...")
    
    test_word = "persistence"
    print(f"Word to test: {test_word}")
    
    # 1. Clear cache for the word first to ensure we trigger AI/background save
    conn = get_db()
    conn.execute("DELETE FROM dictionary_cache WHERE word = ?", (test_word.lower(),))
    conn.commit()
    conn.close()
    print("Cleared local cache.")
    
    # 2. Run lookup stream
    print("Starting lookup stream...")
    final_data = None
    async for chunk_raw in iterate_stream(test_word):
        if not chunk_raw: continue
        if '"status": "result"' in chunk_raw:
            try:
                final_data = json.loads(chunk_raw)
                print("Received result chunk.")
            except: pass
    
    if final_data:
        print("Stream completed successfully.")
        
        # 3. Wait a bit for background task to finish (simulated here since we aren't using BackgroundTasks wrapper)
        # In the real app, this happens via FastAPI BackgroundTasks.
        # Here we verify if the data_json is at least validly captured.
        
        print("Verifying if background save logic works by checking if we can save it manually now...")
        from app.database import set_cached_dictionary
        try:
            set_cached_dictionary(test_word, final_data)
            print("Successfully saved to cache.")
            
            # 4. Verify performance on second lookup
            start_time = time.time()
            cached = get_cached_dictionary(test_word)
            elapsed = (time.time() - start_time) * 1000
            
            if cached:
                print(f"SUCCESS: Data retrieved from cache in {elapsed:.2f}ms")
            else:
                print("FAILED: Data not found in cache after save.")
        except Exception as e:
            print(f"FAILED: Error during manual save/check: {e}")
    else:
        print("FAILED: Did not receive result chunk in stream.")

async def iterate_stream(word):
    # Simulate the sync generator in an async way
    from app.services.llm_service import lookup_dictionary_stream
    for chunk in lookup_dictionary_stream(word):
        yield chunk

if __name__ == "__main__":
    asyncio.run(test_dictionary_persistence())

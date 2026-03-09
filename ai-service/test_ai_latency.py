import sys
import os
import time

# Add the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import llm_service
from dotenv import load_dotenv

load_dotenv()

def test_dictionary_lookup(word):
    print(f"\n--- Testing Lookup: '{word}' ---")
    start_total = time.time()
    
    # Test internal free dictionary lookup
    print("Testing Free Dictionary API...")
    free_data = llm_service.lookup_free_dictionary(word)
    if free_data:
        print(f"✅ Free API: Found {len(free_data.get('meanings', []))} meanings")
    else:
        print("❌ Free API: Not found")
        
    # Test hybrid lookup
    print("\nTesting Hybrid AI Lookup (sync)...")
    start_ai = time.time()
    result = llm_service.lookup_dictionary(word)
    end_ai = time.time()
    
    if result:
        print(f"✅ Hybrid Result: {result.get('word')} ({result.get('level', 'N/A')})")
        print(f"✅ AI Time: {end_ai - start_ai:.2f}s")
        if "_from_cache" in result:
            print("✅ Result came from cache!")
    else:
        print("❌ Hybrid Result failed")
        
    print(f"\nTotal process took: {time.time() - start_total:.2f}s")

if __name__ == "__main__":
    test_word = "accomplish"
    test_dictionary_lookup(test_word)
    
    # Test second time for cache check
    print("\n--- SECOND LOOKUP (Cache check) ---")
    test_dictionary_lookup(test_word)

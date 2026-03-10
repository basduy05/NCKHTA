import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.llm_service import lookup_dictionary_stream

print("Testing dictionary lookup streaming with primary LLM (Google)...")
try:
    # Run vocabulary lookup for a new word to avoid cache
    test_word = "educational"
    print(f"Word: {test_word}")
    
    found_result = False
    for chunk in lookup_dictionary_stream(test_word):
        if not chunk: continue
        try:
            data = json.loads(chunk)
            if "error" in data:
                print(f"\nERROR in chunk: {data['error']}")
            elif "meanings" in data and len(data["meanings"]) > 0:
                found_result = True
                print(".", end="", flush=True)
            else:
                print("?", end="", flush=True)
        except:
             # Streaming partial JSONs might fail to parse line by line
             pass
    
    if found_result:
        print("\n\nSUCCESS: Dictionary lookup returned meanings!")
    else:
        print("\n\nFAILED: No meanings found in response.")

except Exception as e:
    print(f"\n\nCRITICAL FAILURE: {e}")

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.llm_service import lookup_dictionary_stream

print("Testing dictionary lookup streaming with Cohere...")
try:
    # Set os environment to use Cohere API if available
    # Or rely on get_llm falling back to Cohere
    from app.services.llm_service import get_llm
    llm = get_llm(provider="cohere")
    print("Cohere LLM instantiated successfully:", type(llm).__name__)
    
    # Run vocabulary lookup
    for chunk in lookup_dictionary_stream("legendary"):
        print(chunk, end="")
    print("\nSUCCESS")
except Exception as e:
    print(f"\nFAILED: {e}")

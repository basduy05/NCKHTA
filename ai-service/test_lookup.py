import os
import sys

# Add the project root to sys.path so we can import app modules
sys.path.insert(0, 'c:/Users/basdu/Downloads/NCKHTA/ai-service')

from app.services.llm_service import lookup_dictionary, is_data_complete

print("=== Looking up 'legendary' ===")
try:
    result = lookup_dictionary("legendary")
    print("\n[IS COMPLETE?]", is_data_complete(result))
    import json
    with open('res2.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print("Saved to res2.json")
except Exception as e:
    import traceback
    traceback.print_exc()

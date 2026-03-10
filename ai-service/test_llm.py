
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.llm_service import generate_exercises_from_text

# Sample text
text = "The boy is playing in the garden. He has lived here for ten years."
res = generate_exercises_from_text(text, exercise_type="mcq", num_questions=2)
print("SUCCESS" if "exercises" in res else "FAILED")
if "exercises" in res:
   print(res["exercises"][0]["question"])

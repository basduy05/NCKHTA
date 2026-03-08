import json
import os
import sys

sys.path.insert(0, 'c:/Users/basdu/Downloads/NCKHTA/ai-service')
from app.services.llm_service import is_data_complete

with open("res2.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print("=== Checking Completeness for Cohere Output ===")
if not data or not isinstance(data, dict):
    print("Failed: not dict")
    sys.exit()

meanings = data.get("meanings", [])
if not meanings or len(meanings) == 0:
    print("Failed: no meanings")
    sys.exit()

missing_vn = [i for i, m in enumerate(meanings) if not m.get("definition_vn")]
missing_en = [i for i, m in enumerate(meanings) if not m.get("definition_en")]
missing_examples = [i for i, m in enumerate(meanings) if not m.get("examples") or len(m.get("examples", [])) == 0]

print(f"Missing VN at index: {missing_vn}")
print(f"Missing EN at index: {missing_en}")
print(f"Missing Examples at index: {missing_examples}")

has_phonetic = bool(data.get("phonetic_uk") or data.get("phonetic_us"))
print(f"Has Phonetic: {has_phonetic}")

has_level = bool(data.get("level") and data.get("level") in ("A1", "A2", "B1", "B2", "C1", "C2"))
print(f"Has Level: {has_level} (Level: {data.get('level')})")

has_new_fields = "idioms" in data and "collocations" in data and "register" in meanings[0]
print(f"Has New Fields: {has_new_fields} (idioms={ 'idioms' in data}, collocations={'collocations' in data}, register={'register' in meanings[0]})")

print(f"\nFinal is_data_complete() result: {is_data_complete(data)}")


import json
from app.services.llm_service import parse_json_response

def test_font_fix():
    print("--- Testing Vietnamese Font Preservation ---")
    
    # Test 1: Raw Vietnamese JSON
    raw_vn = '{"meaning_vn": "Xin chào, đây là tiếng Việt"}'
    parsed1 = parse_json_response(raw_vn)
    print(f"Original Raw: {raw_vn}")
    print(f"Parsed Meaning: {parsed1.get('meaning_vn')}")
    if parsed1.get('meaning_vn') == "Xin chào, đây là tiếng Việt":
        print("✅ Case 1 Passed: Raw Vietnamese preserved.")
    else:
        print("❌ Case 1 Failed: Raw Vietnamese corrupted.")

    # Test 2: JSON inside Markdown block
    md_json = "Here is the result:\n```json\n" + '{"test": "thành công"}' + "\n```"
    parsed2 = parse_json_response(md_json)
    print(f"\nMarkdown Input: {md_json}")
    if parsed2.get('test') == "thành công":
        print("✅ Case 2 Passed: Markdown JSON handled correctly.")
    else:
        print(f"❌ Case 2 Failed: Got {parsed2}")

    # Test 3: Mixed escaped and raw (legacy compatibility)
    # Note: parse_json_response no longer handles \u manually, 
    # but json.loads() does it automatically and safely.
    mixed = '{"escaped": "\\u0068\\u0065\\u006c\\u006c\\u006f", "raw": "hữu"}'
    parsed3 = parse_json_response(mixed)
    print(f"\nMixed Input: {mixed}")
    print(f"Parsed Escaped: {parsed3.get('escaped')}")
    print(f"Parsed Raw: {parsed3.get('raw')}")
    if parsed3.get('escaped') == "hello" and parsed3.get('raw') == "hữu":
        print("✅ Case 3 Passed: Both escaped and raw handled correctly.")
    else:
        print("❌ Case 3 Failed.")

if __name__ == "__main__":
    test_font_fix()


# Test reproduction for Vietnamese font corruption issue in llm_service.py

def reproduce_corruption(content: str):
    print(f"Original: {content}")
    try:
        # This is the logic used in llm_service.py (multiple places)
        # It's intended to fix \uXXXX but destroys raw UTF-8 Vietnamese
        corrupted = content.encode('utf-8').decode('unicode_escape')
        print(f"Post-'Fix': {corrupted}")
        if content != corrupted:
            print("❌ CORRUPTION DETECTED!")
        else:
            print("✅ No change (Safe for this string)")
    except Exception as e:
        print(f"❌ ERROR: {e}")

# Case 1: Raw Vietnamese (Most common case for modern LLMs)
print("\n--- Case 1: Raw Vietnamese ---")
reproduce_corruption("Xin chào, tôi là AI")

# Case 2: Mixed Escaped + Vietnamese
print("\n--- Case 2: Mixed ---")
reproduce_corruption("Từ: \\u1ebf (ế)")

# Case 3: Just Escaped (The only case where the code works)
print("\n--- Case 3: Pure Escaped ---")
reproduce_corruption("\\u1ebf")

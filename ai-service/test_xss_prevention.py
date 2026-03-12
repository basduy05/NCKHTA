import os
import sys
import re

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def clean_html_regex(text: str) -> str:
    if not text: return ""
    # 1. Remove <script>...</script> and its content completely
    text = re.sub(r'<script.*?>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    # 2. Strip all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def run_test():
    test_cases = [
        ("<script>alert(1)</script> Nguyễn Văn A", "Nguyễn Văn A"),
        ("<img src=x onerror=alert('cookie')> 0912345678", "0912345678"),
        ("<b>Hello</b> <i>World</i>", "Hello World"),
        ("<iframe src=\"malicious.com\"></iframe> Attack", "Attack")
    ]
    
    print("=" * 40)
    print("XSS SANITIZATION TEST")
    print("=" * 40)
    
    all_passed = True
    for input_text, expected in test_cases:
        result = clean_html_regex(input_text)
        if result == expected:
            print(f"PASS: '{input_text[:30]}...' -> '{result}'")
        else:
            print(f"FAIL: '{input_text[:30]}...' -> '{result}' (Expected: '{expected}')")
            all_passed = False
            
    if all_passed:
        print("\nALL XSS TESTS PASSED! ✅")
    else:
        print("\nSOME XSS TESTS FAILED! ❌")

if __name__ == "__main__":
    run_test()

import sys
import codecs

path1 = r'C:\Users\basdu\Downloads\NCKHTA\ai-service\app\services\llm_service.py'
with codecs.open(path1, 'r', encoding='utf-8') as f:
    text1 = f.read()

old_str1 = '''                # Dùng Gemma tốc độ cao và unlimited theo yêu cầu người dùng
                if difficulty == "hard":
                    model_names = ["gemma-4-31b", "gemma-4-26b", "gemini-3.1-pro", "gemini-2.5-pro"]
                elif difficulty == "easy":
                    model_names = ["gemma-3-12b", "gemma-3-4b", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"]
                else: # medium
                    model_names = ["gemma-3-27b", "gemini-3.1-flash-lite", "gemini-3-flash", "gemini-2.5-flash"]'''

new_str1 = '''                # Rollback from Gemma (Not supported yet via Langchain ChatGoogleGenerativeAI)
                if difficulty == "hard":
                    model_names = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-pro-latest"]
                elif difficulty == "easy":
                    model_names = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-flash-latest"]
                else: # medium
                    model_names = ["gemini-1.5-flash", "gemini-1.5-pro-latest", "gemini-1.5-flash"]'''

if old_str1 in text1:
    with codecs.open(path1, 'w', encoding='utf-8') as f:
        f.write(text1.replace(old_str1, new_str1))
    print('Updated llm_service.py')

path2 = r'C:\Users\basdu\Downloads\NCKHTA\ai-service\app\services\referee_service.py'
with codecs.open(path2, 'r', encoding='utf-8') as f:
    text2 = f.read()

# Instead of checking string exactly, let's just use regex
import re
text2 = re.sub(r'model="gemma-3-27b"', 'model="gemini-1.5-flash"', text2)

with codecs.open(path2, 'w', encoding='utf-8') as f:
    f.write(text2)
print('Updated referee_service.py')

import re
import codecs

path1 = r'C:\Users\basdu\Downloads\NCKHTA\ai-service\app\services\llm_service.py'
with codecs.open(path1, 'r', encoding='utf-8') as f:
    text1 = f.read()

pattern = re.compile(r'#.*?(if difficulty == "hard":\s+model_names = \["gemma-4-31b.*?gemini-2\.5-flash"\])', re.DOTALL)

new_str1 = '''# Rollback from Gemma (Not supported yet via Langchain ChatGoogleGenerativeAI)
                if difficulty == "hard":
                    model_names = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-pro-latest"]
                elif difficulty == "easy":
                    model_names = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-flash-latest"]
                else: # medium
                    model_names = ["gemini-1.5-flash", "gemini-1.5-pro-latest", "gemini-1.5-flash"]'''

text1 = pattern.sub(new_str1, text1)

with codecs.open(path1, 'w', encoding='utf-8') as f:
    f.write(text1)

print('Updated llm_service regexly')

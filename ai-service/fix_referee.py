import sys
path = 'C:/Users/basdu/Downloads/NCKHTA/ai-service/app/services/referee_service.py'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('model="gemini-2.5-flash"', 'model="gemma-3-27b"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print('Replaced referee model to Gemma')
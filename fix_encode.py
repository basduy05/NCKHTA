import sys
path = 'C:/Users/basdu/Downloads/NCKHTA/ai-service/app/services/referee_service.py'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('referee_prompt = f')
end = text.find('    start_time = time')

new_text = text[:start] + '''referee_prompt = f\"\"\"B?n là m?t Giám kh?o AI (AI Referee) chuyên nghi?p. Nhi?m v? c?a b?n là dánh giá ch?t lu?ng ph?n h?i c?a m?t AI khác.

Du?i dây là thông tin chi ti?t:
- Tính nang: {feature}
- Yêu c?u c?a ngu?i dùng (Prompt): {original_prompt}
- Ph?n h?i c?a AI (Response): {ai_response}

Tiêu chí dánh giá:
1. Ð? chính xác: Thông tin có dúng không?
2. Ð?nh d?ng: Có tuân th? d?nh d?ng yêu c?u (JSON, Markdown,...) không?
3. Ngôn ng?: Ti?ng Anh/Ti?ng Vi?t có t? nhiên không?
4. S? h?u ích: Có gi?i quy?t du?c v?n d? c?a ngu?i dùng không?

Hãy tr? v? DUY NH?T 1 chu?i JSON theo d?nh d?ng sau (không gi?i thích thêm, không markdown \\\json):
{{{{
  "score": 8.5,
  "feedback": "Phân tích ng?n g?n di?m t?t và chua t?t",
  "suggested_improvement": "G?i ý c? th? d? c?i thi?n k?t qu?"
}}}}
\"\"\"

''' + text[end:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_text)
print('Fixed encoding')

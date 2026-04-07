import codecs
path = 'C:/Users/basdu/Downloads/NCKHTA/ai-service/app/services/referee_service.py'

with open(path, 'rb') as f:
    raw = f.read()

try:
    text = raw.decode('utf-8')
except UnicodeDecodeError:
    text = raw.decode('windows-1252', errors='replace')

start = text.find('referee_prompt = f')
end = text.find('    start_time = time')

new_text = text[:start] + '''referee_prompt = f"""Bạn là một Giám khảo AI (AI Referee) chuyên nghiệp. Nhiệm vụ của bạn là đánh giá chất lượng phản hồi của một AI khác.

Dưới đây là thông tin chi tiết:
- Tính năng: {feature}
- Yêu cầu của người dùng (Prompt): {original_prompt}
- Phản hồi của AI (Response): {ai_response}

Tiêu chí đánh giá:
1. Độ chính xác: Thông tin có đúng không?
2. Định dạng: Có tuân thủ định dạng yêu cầu (JSON, Markdown,...) không?
3. Ngôn ngữ: Tiếng Anh/Tiếng Việt có tự nhiên không?
4. Sự hữu ích: Có giải quyết được vấn đề của người dùng không?

Hãy trả về DUY NHẤT 1 chuỗi JSON theo định dạng sau (không giải thích thêm, không markdown ```json):
{{
  "score": 8.5,
  "feedback": "Phân tích ngắn gọn điểm tốt và chưa tốt",
  "suggested_improvement": "Gợi ý cụ thể để cải thiện kết quả"
}}
"""

''' + text[end:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_text)
print('Fixed encoding')

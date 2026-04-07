import codecs

path = 'C:/Users/basdu/Downloads/NCKHTA/ai-service/app/services/referee_service.py'

with codecs.open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the whole evaluate_ai_response function
import re
pattern = re.compile(r'async def evaluate_ai_response.*?except Exception as e:\s+print\(f"\[REFEREE ERROR\] Failed to evaluate: \{e\}"\)', re.DOTALL)

new_func = '''async def evaluate_ai_response(
    user_id: Optional[int],
    endpoint: str,
    original_prompt: str,
    ai_response: str,
    model_used: str,
    feature: str = "Unknown"
):
    """
    Evaluates an AI response in the background and logs the result.
    This does NOT block the main response to the user.
    """
    llm = get_referee_llm()
    if not llm:
        return
        
    llm_name = getattr(llm, "model_name", getattr(llm, "model", getattr(llm, "model_id", "unknown-model")))
    
    referee_prompt = f"""Bạn là một Giám khảo AI (AI Referee) chuyên nghiệp. Nhiệm vụ của bạn là đánh giá chất lượng phản hồi của một AI khác.

Dưới đây là thông tin chi tiết:
- Tính năng: {feature}
- Yêu cầu của người dùng (Prompt): {original_prompt}
- Phản hồi của AI (Response): {ai_response}

Tiêu chí đánh giá:
1. Độ chính xác: Thông tin có đúng không? Thỏa mãn yêu cầu không?
2. Định dạng: Có tuân thủ định dạng yêu cầu (JSON, Markdown,...) không?
3. Sự hữu ích: Có giải quyết được vấn đề của người dùng không?

Hãy trả về DUY NHẤT 1 chuỗi JSON theo định dạng sau (không giải thích thêm, không markdown \`\`\`json):
{{
  "score": 8.5,
  "feedback": "Phân tích ngắn gọn điểm tốt và điểm chưa tốt của AI",
  "suggested_improvement": "Gợi ý cụ thể để cải thiện kết quả"
}}
"""

    start_time = time.time()
    try:
        # We use a simple invoke for evaluation
        res = await asyncio.to_thread(llm.invoke, [HumanMessage(content=referee_prompt)])
        latency = int((time.time() - start_time) * 1000)
        
        content = res.content
        # Clean up JSON if LLM added markdown fences
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        import json
        data = json.loads(content)
        score = data.get("score", 0)
        feedback = data.get("feedback", "")
        if data.get("suggested_improvement"):
            feedback += f" | Gợi ý cải thiện: {data['suggested_improvement']}"
            
        from ..database import log_ai_request
        log_ai_request(
            user_id=user_id,
            endpoint=f"referee/{endpoint}",
            model=llm_name,
            difficulty="eval",
            latency_ms=latency,
            status="evaluated",
            feature=feature,
            response_content=ai_response,
            eval_score=score,
            eval_feedback=feedback
        )
        print(f"[REFEREE] Evaluated {endpoint}: Score {score}/10")
        
    except Exception as e:
        print(f"[REFEREE ERROR] Failed to evaluate: {e}")'''

if pattern.search(text):
    text = pattern.sub(new_func, text)
    with codecs.open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Evaluate function successfully replaced.")
else:
    print("Could not find the function to replace using regex!")

from typing import Optional, Dict, Any
import asyncio
import json
import time
from langchain_core.messages import HumanMessage, SystemMessage
from ..database import log_ai_request, get_setting, is_provider_failed

# Avoid circular imports by using a localized get_llm or just creating the LLM here
def get_referee_llm():
    """Get a high-quality model for judging other AI outputs with fallback."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_cohere import ChatCohere
    from ..database import is_provider_failed
    
    # Try Gemini first if not failed
    if not is_provider_failed("Gemini"):
        key = get_setting("GOOGLE_API_KEY")
        if key:
            return ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", google_api_key=key, temperature=0)
    
    # Fallback to Cohere
    key = get_setting("COHERE_API_KEY")
    if key:
        return ChatCohere(model="command-r-08-2024", cohere_api_key=key, temperature=0)
        
    return None

async def evaluate_ai_response(
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
        
    referee_prompt = f"""
Bạn là một Giám khảo AI (AI Referee) chuyên nghiệp. Nhiệm vụ của bạn là đánh giá chất lượng phản hồi của một AI khác.

Dưới đây là thông tin chi tiết:
- Tính năng: {feature}
- Yêu cầu của người dùng: {original_prompt}
- Phản hồi của AI: {ai_response}

Hãy đánh giá dựa trên các tiêu chí:
1. Độ chính xác: Thông tin có đúng không?
2. Định dạng: Có tuân thủ định dạng yêu cầu (JSON, Markdown,...) không?
3. Ngôn ngữ: Tiếng Anh/Tiếng Việt có tự nhiên không?
4. Sự hữu ích: Có giải quyết được vấn đề của người dùng không?

TRẢ VỀ KẾT QUẢ DƯỚI DẠNG JSON DUY NHẤT:
{{
  "score": (điểm từ 1-10),
  "feedback": "Nhận xét ngắn gọn, chỉ ra lỗi nếu có và cách cải thiện cho lần sau",
  "suggested_improvement": "Gợi ý cụ thể để làm tốt hơn (ví dụ: cần thêm ví dụ, cần định dạng lại JSON...)"
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
            
        data = json.loads(content)
        score = data.get("score", 0)
        feedback = data.get("feedback", "")
        if data.get("suggested_improvement"):
            feedback += f" | Gợi ý: {data['suggested_improvement']}"
            
        # Log the evaluation into the same record if possible? 
        # Actually, log_ai_request creates a NEW record. 
        # For evaluation, we ideally want to update the existing record or log it as a 'referee' event.
        # The user wants to "đánh giá sau mỗi output", so we log it as an evaluation event.
        log_ai_request(
            user_id=user_id,
            endpoint=f"referee/{endpoint}",
            model="gemini-3.1-flash-lite",
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
        print(f"[REFEREE ERROR] Failed to evaluate: {e}")

def trigger_evaluation(user_id, endpoint, prompt, response, model, feature):
    """Fire-and-forget evaluation."""
    asyncio.create_task(evaluate_ai_response(user_id, endpoint, prompt, response, model, feature))

async def fast_repair_json(original_prompt: str, broken_content: str, feature: str = "Unknown") -> Optional[str]:
    """
    Synchronous (but async-awaitable) repair call for broken JSON.
    Uses the fastest model possible to fix ONLY the formatting.
    """
    llm = get_referee_llm()
    if not llm:
        return None
        
    # Keep prompt compact to minimize tokens and repair latency.
    compact_original = (original_prompt or "")[:220]
    compact_broken = (broken_content or "")[:6000]
    repair_prompt = f"""
Ban la bo sua JSON toc do cao.
Feature: {feature}
Prompt goc: {compact_original}
Noi dung loi:
{compact_broken}

YEU CAU BAT BUOC:
1) Chi tra ve DUY NHAT JSON hop le.
2) Khong markdown, khong giai thich, khong text ngoai JSON.
3) Giu nguyen y nghia noi dung toi da, chi sua dinh dang/cau truc.
4) Neu thieu khoa quan trong, bo sung khoa toi thieu de JSON hop le.
"""

    start_time = time.time()
    try:
        res = await asyncio.to_thread(llm.invoke, [HumanMessage(content=repair_prompt)])
        latency = int((time.time() - start_time) * 1000)
        
        from ..utils.json_utils import clean_json_string
        fixed_content = clean_json_string(res.content)
        
        # Log the repair event
        log_ai_request(
            user_id=None,
            endpoint=f"repair/{feature}",
            model=getattr(llm, "model_name", "fast-repairer"),
            difficulty="repair",
            latency_ms=latency,
            status="repaired",
            feature=feature,
            response_content=fixed_content
        )
        return fixed_content
    except Exception as e:
        print(f"[REPAIR ERROR] Failed: {e}")
        return None

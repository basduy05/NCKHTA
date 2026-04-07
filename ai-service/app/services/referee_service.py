from typing import Optional
import asyncio
import json
import time

from langchain_core.messages import HumanMessage, SystemMessage

from ..database import get_setting, is_provider_failed, log_ai_request


def get_referee_llm():
    """Return the best available model for judging AI outputs."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_cohere import ChatCohere

    if not is_provider_failed("Gemini"):
        key = get_setting("GOOGLE_API_KEY")
        if key:
            return ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=key,
                temperature=0,
                timeout=20,
            )

    key = get_setting("COHERE_API_KEY")
    if key:
        return ChatCohere(model="command-a-03-2025", cohere_api_key=key, temperature=0)

    return None


def get_repair_llm():
    """Return the fastest reliable model for JSON repair / formatting fixes."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_cohere import ChatCohere

    if not is_provider_failed("Gemini"):
        key = get_setting("GOOGLE_API_KEY")
        if key:
            return ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                google_api_key=key,
                temperature=0,
                timeout=15,
            )

    key = get_setting("COHERE_API_KEY")
    if key:
        return ChatCohere(model="command-r7b-12-2024", cohere_api_key=key, temperature=0)

    return None


async def evaluate_ai_response(
    user_id: Optional[int],
    endpoint: str,
    original_prompt: str,
    ai_response: str,
    model_used: str,
    feature: str = "Unknown",
):
    """
    Evaluate an AI response in the background and log the result.
    This does not block the main response to the user.
    """
    llm = get_referee_llm()
    if not llm:
        return

    llm_name = getattr(llm, "model_name", getattr(llm, "model", getattr(llm, "model_id", "unknown-model")))
    compact_prompt = str(original_prompt or "")[:4000]
    compact_response = str(ai_response or "")[:12000]

    referee_prompt = f"""
Ban la mot AI referee chuyen nghiep. Hay danh gia chat luong output cua mot AI khac.

Thong tin:
- Tinh nang: {feature}
- Model da dung: {model_used}
- Prompt cua nguoi dung: {compact_prompt}
- Phan hoi cua AI: {compact_response}

Tieu chi danh gia:
1. Do chinh xac
2. Muc do dung yeu cau
3. Dinh dang output
4. Muc do huu ich thuc te

Tra ve DUY NHAT mot JSON hop le, khong markdown, khong giai thich ngoai JSON:
{{
  "score": 8.5,
  "feedback": "Nhan xet ngan gon, cu the.",
  "suggested_improvement": "Neu can, goi y cach cai thien."
}}
""".strip()

    start_time = time.time()
    try:
        res = await asyncio.to_thread(
            llm.invoke,
            [
                SystemMessage(content="Chi tra ve JSON hop le. Khong markdown. Khong text ngoai JSON."),
                HumanMessage(content=referee_prompt),
            ],
        )
        latency = int((time.time() - start_time) * 1000)

        content = res.content
        if "```json" in content:
            content = content.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in content:
            content = content.split("```", 1)[1].split("```", 1)[0].strip()

        try:
            data = json.loads(content)
        except Exception:
            from ..utils.json_utils import clean_json_string

            data = json.loads(clean_json_string(content))

        score = data.get("score", 0)
        feedback = data.get("feedback", "")
        if data.get("suggested_improvement"):
            feedback += f" | Goi y cai thien: {data['suggested_improvement']}"

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
            eval_feedback=feedback,
        )
        print(f"[REFEREE] Evaluated {endpoint}: Score {score}/10")
    except Exception as e:
        print(f"[REFEREE ERROR] Failed to evaluate: {e}")


def trigger_evaluation(user_id, endpoint, prompt, response, model, feature):
    """Fire-and-forget evaluation."""
    asyncio.create_task(evaluate_ai_response(user_id, endpoint, prompt, response, model, feature))


async def fast_repair_json(original_prompt: str, broken_content: str, feature: str = "Unknown") -> Optional[str]:
    """
    Fast JSON repair call.
    Uses the fastest reliable model possible to fix formatting and structure only.
    """
    llm = get_repair_llm()
    if not llm:
        return None

    compact_original = (original_prompt or "")[:220]
    compact_broken = (broken_content or "")[:6000]

    repair_prompt = f"""
Ban la bo sua JSON toc do cao.

Feature: {feature}
Prompt goc: {compact_original}
Noi dung loi:
{compact_broken}

YEU CAU BAT BUOC:
1. Chi tra ve DUY NHAT JSON hop le.
2. Khong markdown, khong giai thich, khong text ngoai JSON.
3. Giu nguyen y nghia toi da, chi sua dinh dang / cau truc.
4. Neu thieu khoa quan trong, bo sung khoa toi thieu de JSON hop le.
""".strip()

    start_time = time.time()
    try:
        res = await asyncio.to_thread(
            llm.invoke,
            [
                SystemMessage(content="Chi tra ve JSON hop le. Khong markdown. Khong giai thich."),
                HumanMessage(content=repair_prompt),
            ],
        )
        latency = int((time.time() - start_time) * 1000)

        from ..utils.json_utils import clean_json_string

        fixed_content = clean_json_string(res.content)

        log_ai_request(
            user_id=None,
            endpoint=f"repair/{feature}",
            model=getattr(llm, "model_name", getattr(llm, "model", "fast-repairer")),
            difficulty="repair",
            latency_ms=latency,
            status="repaired",
            feature=feature,
            response_content=fixed_content,
        )
        return fixed_content
    except Exception as e:
        print(f"[REPAIR ERROR] Failed: {e}")
        return None

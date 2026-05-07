"""
AI Chatbot router — multilingual, context-aware, streaming responses.
Endpoint prefix: /chat  (no auth dependency; uses get_current_user from main.py router inclusion)
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import json
import asyncio
import time

router = APIRouter(prefix="/chat", tags=["AI Chat"])

# ─── Suggested questions per feature ────────────────────────────────────────

SUGGESTED_QUESTIONS: dict[str, list[str]] = {
    "dictionary": [
        "Từ này có những nghĩa nào khác không?",
        "Cho tôi ví dụ câu tự nhiên với từ này",
        "Từ đồng nghĩa và trái nghĩa phổ biến nhất?",
        "Cách dùng từ này trong bài thi IELTS/TOEIC?",
        "Nguồn gốc (etymology) của từ này?",
    ],
    "vocabulary": [
        "Mẹo nhớ từ này lâu và hiệu quả?",
        "Tạo 3 câu ví dụ mới với từ này",
        "Từ này hay bị nhầm với từ nào khác?",
        "Từ này thuộc cấp độ CEFR nào?",
        "Collocations phổ biến của từ này?",
    ],
    "grammar": [
        "Giải thích quy tắc này đơn giản hơn với ví dụ",
        "Lỗi phổ biến nhất khi dùng quy tắc này?",
        "So sánh với quy tắc ngữ pháp tương tự",
        "Bài tập luyện tập nhanh cho quy tắc này?",
        "Quy tắc này khác gì so với tiếng Việt?",
    ],
    "practice": [
        "Phân tích chi tiết câu trả lời vừa rồi",
        "Mẹo làm bài dạng này nhanh và chính xác hơn?",
        "Chiến lược thi IELTS/TOEIC cho phần này?",
        "Tại sao đáp án này đúng/sai?",
    ],
    "ipa": [
        "Giải thích cách phát âm âm thanh này",
        "Khác nhau giữa giọng UK và US trong âm này?",
        "Cách luyện phát âm âm khó này hiệu quả?",
        "Người Việt thường phát âm sai ở đâu?",
    ],
    "classes": [
        "Tóm tắt nội dung bài học này cho tôi",
        "Tạo câu hỏi ôn tập cho bài học này",
        "Giải thích khái niệm khó trong bài",
        "Cách học bài này hiệu quả nhất?",
    ],
    "ai-tools": [
        "Phân tích điểm mạnh trong bài viết của tôi",
        "Cách cải thiện band IELTS Writing?",
        "Đề xuất cách diễn đạt tốt hơn cho câu này?",
        "Bài viết này đạt band mấy?",
    ],
    "scores": [
        "Phân tích kết quả học tập của tôi",
        "Tôi cần cải thiện kỹ năng nào nhất?",
        "Lộ trình học phù hợp với tiến độ của tôi?",
    ],
    "roadmap": [
        "Giải thích chi tiết bước học này",
        "Mốc thời gian học có hợp lý không?",
        "Cách thực hiện bước này hiệu quả hơn?",
    ],
    "assignments": [
        "Hướng dẫn làm bài tập này",
        "Giải thích yêu cầu của bài tập",
        "Mẹo viết bài essay hay hơn?",
    ],
    "general": [
        "Giải thích khái niệm tiếng Anh này cho tôi",
        "Mẹo học tiếng Anh hiệu quả nhất?",
        "Sự khác biệt giữa hai từ/cụm từ này?",
        "Ví dụ câu trong giao tiếp thực tế?",
        "Cách cải thiện kỹ năng nghe/nói nhanh?",
    ],
}

# ─── Models ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    feature: str = "general"
    context_data: Optional[dict] = None   # {word, meaning_vn, pos, rule, ...}
    history: Optional[List[dict]] = None  # [{role:"user"|"assistant", content:"..."}]
    language: str = "vi"                  # "vi" | "en"

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _build_context_block(feature: str, ctx: Optional[dict]) -> str:
    if not ctx:
        return ""
    parts = []
    if feature == "dictionary":
        if ctx.get("word"):
            parts.append(f"Word being looked up: \"{ctx['word']}\"")
        if ctx.get("pos"):
            parts.append(f"Part of speech: {ctx['pos']}")
        if ctx.get("meaning_vn"):
            parts.append(f"Vietnamese meaning: {ctx['meaning_vn']}")
        if ctx.get("meaning_en"):
            parts.append(f"English definition: {ctx['meaning_en']}")
        if ctx.get("level"):
            parts.append(f"CEFR level: {ctx['level']}")
    elif feature == "vocabulary":
        if ctx.get("word"):
            parts.append(f"Word being studied: \"{ctx['word']}\"")
        if ctx.get("meaning_vn"):
            parts.append(f"Meaning: {ctx['meaning_vn']}")
    elif feature == "grammar":
        if ctx.get("rule"):
            parts.append(f"Grammar rule: {ctx['rule']}")
        if ctx.get("description"):
            parts.append(f"Rule description: {ctx['description']}")
    elif feature == "practice":
        if ctx.get("test_type"):
            parts.append(f"Test type: {ctx['test_type']}")
        if ctx.get("skill"):
            parts.append(f"Skill: {ctx['skill']}")
    return "\n".join(parts)

def _build_system_prompt(feature: str, ctx: Optional[dict], language: str) -> str:
    lang_rule = (
        "ALWAYS respond in Vietnamese (tiếng Việt). Use English only for English words, terms, and examples."
        if language == "vi"
        else "Respond in English. Provide Vietnamese translations in parentheses when helpful."
    )
    context_block = _build_context_block(feature, ctx)
    feature_hint = {
        "dictionary": "Help the user understand the vocabulary word deeply — meaning, usage, examples.",
        "vocabulary": "Help the user memorize and use this vocabulary word effectively.",
        "grammar": "Explain grammar rules clearly with simple examples and practice tips.",
        "practice": "Help the user understand test strategies and analyze answers.",
        "ipa": "Guide pronunciation practice with clear phonetic explanations.",
        "classes": "Help the user understand lesson content and review effectively.",
        "ai-tools": "Help the user improve their English writing, speaking, or listening skills.",
        "general": "Provide helpful, concise English learning guidance.",
    }.get(feature, "Provide helpful, concise English learning guidance.")

    return f"""You are EAM Assistant — an expert AI English learning tutor for the EAM (English AI Mentor) platform used by Vietnamese students.

{lang_rule}

Current feature: {feature}
Your role: {feature_hint}
{f"Context:{chr(10)}{context_block}" if context_block else ""}

Guidelines:
- Be concise but comprehensive (aim for 150-300 words unless detail is needed)
- Use markdown formatting: **bold** for key terms, bullet lists for multiple points
- Always include practical examples with Vietnamese translations in parentheses
- Be encouraging and educational in tone
- For English words, always write them in their original form
- If asked to create exercises or questions, format them clearly and number them"""

async def _stream_llm_response(messages: list, language: str):
    """Call LLM and yield streaming chunks. Yields JSON strings."""
    from ..services.llm_service import get_llm
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

    llm = get_llm()
    if not llm:
        yield json.dumps({"text": "❌ AI service hiện không khả dụng. Vui lòng thử lại sau.", "done": True})
        return

    lc_messages = []
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role == "system":
            lc_messages.append(SystemMessage(content=content))
        elif role == "user":
            lc_messages.append(HumanMessage(content=content))
        elif role == "assistant":
            lc_messages.append(AIMessage(content=content))

    try:
        # True streaming via LangChain stream()
        loop = asyncio.get_event_loop()

        full_text = ""
        buffer = ""

        def _invoke():
            return llm.invoke(lc_messages)

        # Try streaming first; fall back to invoke
        if hasattr(llm, "stream"):
            def _stream_sync():
                chunks = []
                for chunk in llm.stream(lc_messages):
                    text = chunk.content if hasattr(chunk, "content") else str(chunk)
                    chunks.append(text)
                return chunks

            try:
                raw_chunks = await loop.run_in_executor(None, _stream_sync)
                for text in raw_chunks:
                    if text:
                        yield json.dumps({"text": text, "done": False})
                        await asyncio.sleep(0.01)
                yield json.dumps({"text": "", "done": True})
                return
            except Exception:
                pass  # Fall through to invoke

        # Non-streaming fallback
        response = await loop.run_in_executor(None, _invoke)
        full_text = response.content if hasattr(response, "content") else str(response)

        # Simulate streaming word by word for smooth UX
        words = full_text.split(" ")
        batch = []
        for i, word in enumerate(words):
            batch.append(word)
            if len(batch) >= 4 or i == len(words) - 1:
                yield json.dumps({"text": " ".join(batch) + (" " if i < len(words) - 1 else ""), "done": False})
                await asyncio.sleep(0.025)
                batch = []

        yield json.dumps({"text": "", "done": True})

    except Exception as e:
        print(f"[CHAT] LLM error: {e}")
        err_msg = (
            "Xin lỗi, đã xảy ra lỗi khi xử lý. Vui lòng thử lại."
            if language == "vi"
            else "Sorry, an error occurred. Please try again."
        )
        yield json.dumps({"text": err_msg, "done": True, "error": True})

# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/suggestions/{feature}")
def get_suggestions(feature: str):
    """Return suggested quick-question chips for a given feature."""
    questions = SUGGESTED_QUESTIONS.get(feature, SUGGESTED_QUESTIONS["general"])
    return {"feature": feature, "suggestions": questions}

@router.post("/send")
async def chat_send(req: ChatRequest):
    """
    Send a message and receive a streaming AI response.
    SSE format: data: {"text": "...", "done": false|true}\n\n
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(req.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 chars)")

    system_prompt = _build_system_prompt(req.feature, req.context_data, req.language)

    # Build message list — keep last 12 messages for context window efficiency
    messages = [{"role": "system", "content": system_prompt}]
    if req.history:
        for msg in req.history[-12:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": req.message})

    async def event_stream():
        try:
            async for chunk_json in _stream_llm_response(messages, req.language):
                yield f"data: {chunk_json}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'text': str(e), 'done': True, 'error': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

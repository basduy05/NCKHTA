import json
import time
import re
import asyncio
from typing import List, Dict, Optional, Any
from langchain_core.prompts import PromptTemplate

from .providers import (
    get_llm, _safe_invoke, _safe_invoke_async, _safe_astream, 
    ai_semaphore, parse_json_response, _is_valid_ipa_payload, _is_local_fast_mode,
    _parse_json_strict
)
from ...database import log_ai_request
from ..referee_service import trigger_evaluation, fast_repair_json

# ═══════════════════════════════════════════════════════════════════════════════

async def generate_ipa_lesson(words: list = None, focus: str = "vowels"):
    """Generate an IPA learning lesson with interactive exercises."""
    difficulty = "easy" if _is_local_fast_mode() else "medium"
    llm = get_llm(difficulty=difficulty)
    if not llm:
        return {"error": "LLM not configured"}

    words_text = ", ".join(words[:10]) if words else ""
    prompt = PromptTemplate.from_template(
        "You are an expert English phonetics teacher.\n"
        "Create an IPA (International Phonetic Alphabet) lesson focused on: {focus}\n"
        "{words_context}\n\n"
        "Return a JSON object with:\n"
        '"lesson_title": catchy title\n'
        '"introduction": brief explanation of the IPA sounds covered (2-3 sentences)\n'
        '"sounds": array of 6-8 IPA sound objects, each with:\n'
        '  "symbol": IPA symbol (e.g. /iː/)\n'
        '  "name": sound name (e.g. "long ee")\n'
        '  "description": how to produce the sound\n'
        '  "example_words": array of 3 words with this sound\n'
        '  "example_ipa": array of corresponding IPA transcriptions\n'
        '"minimal_pairs": array of 4-6 minimal pair exercises, each with:\n'
        '  "word1": first word\n'
        '  "word2": second word (differs by one sound)\n'
        '  "ipa1": IPA of word1\n'
        '  "ipa2": IPA of word2\n'
        '  "sound_difference": which sound changes\n'
        '"practice_sentences": array of 3-4 sentences focused on target sounds, each with:\n'
        '  "sentence": the sentence text with the target word replaced by [blank] (e.g. "I [blank] the bird." if target is "saw")\n'
        '  "answer": the correct word for the [blank]\n'
        '  "ipa": full IPA transcription\n'
        '  "focus_words": array of words containing target sounds\n'
        '"quiz": array of 5 MCQ questions testing IPA knowledge, each with:\n"question": question text\n'
        '  "options": 4 options\n'
        '  "correct_answer": the correct option\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    words_context = f"Include these words in examples if possible: {words_text}" if words_text else ""
    chain = prompt | llm
    repair_context = f"IPA lesson focus={focus}; words={words_text[:180]}"
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {"focus": focus, "words_context": words_context}, difficulty=difficulty, feature="IPA Lesson")
            parsed = _parse_json_strict(getattr(response, "content", ""))
            if _is_valid_ipa_payload(parsed):
                return parsed

            repaired = await fast_repair_json(repair_context, getattr(response, "content", ""), feature="IPA Lesson")
            if repaired:
                repaired_obj = _parse_json_strict(repaired)
                if _is_valid_ipa_payload(repaired_obj):
                    return repaired_obj

            # Keep backward-compatible fallback behavior.
            result = parse_json_response(getattr(response, "content", ""))
            if _is_valid_ipa_payload(result):
                return result
            return {"error": "Could not parse IPA lesson"}
    except Exception as e:
        print(f"generate_ipa_lesson error: {e}")
        return {"error": str(e)}


async def generate_ipa_lesson_stream(text: str):
    """Streaming version of generate_ipa_lesson."""
    llm = get_llm(difficulty="easy")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return

    prompt = PromptTemplate.from_template(
        "You are an English phonetics (IPA) expert.\n"
        "Generate an IPA lesson based on this text:\n{text}\n\n"
        "Return a JSON object with:\n"
        '"title": lesson title\n'
        '"vocabulary": array of objects with "word", "ipa", "meaning_vn", "audio_link"\n'
        '"practice_sentences": array of sentences with their IPA\n'
        '"tips": 3 pronunciation tips in Vietnamese\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {"text": text}, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
    
    try:
        result = parse_json_response(full_content)
        result["status"] = "success"
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)



async def generate_speaking_topic(level: str = "B1", topic_type: str = "general"):
    """Generate speaking practice topics with model answers."""
    llm = get_llm(difficulty="medium")
    if not llm:
        return {"error": "LLM not configured"}

    prompt = PromptTemplate.from_template(
        "Generate an English speaking practice exercise at CEFR level {level}.\n"
        "Topic type: {topic_type}\n\n"
        "Return a JSON object with:\n"
        '"topic": the main speaking topic/question\n'
        '"preparation_time": seconds to prepare (30-60)\n'
        '"speaking_time": seconds to speak (60-120)\n'
        '"sub_questions": array of 3-4 follow-up questions to guide the speaker\n'
        '"useful_vocabulary": array of 6-8 useful words/phrases, each with:\n'
        '  "phrase": the word/phrase\n'
        '  "meaning_vn": Vietnamese meaning\n'
        '  "usage_example": example sentence\n'
        '"model_answer": a model response (100-150 words)\n'
        '"tips_vn": array of 3-4 speaking tips in Vietnamese\n'
        '"evaluation_criteria": array of criteria to self-assess:\n'
        '  "criterion": name\n'
        '  "description_vn": description in Vietnamese\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {"level": level, "topic_type": topic_type}, difficulty="medium", feature="Speaking Topic")
            result = parse_json_response(response.content)
            if isinstance(result, dict):
                return result
            return {"error": "Could not generate speaking topic"}
    except Exception as e:
        print(f"generate_speaking_topic error: {e}")
        return {"error": str(e)}


async def generate_speaking_topic_stream(level: str = "B1", topic_type: str = "general"):
    """Streaming version of generate_speaking_topic."""
    llm = get_llm(difficulty="medium")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return

    prompt = PromptTemplate.from_template(
        "You are an English speaking coach.\n"
        "Generate a speaking practice session at level {level} (Type: {topic_type}).\n\n"
        "Return JSON with title, prompt, sub_questions (array), model_answer, and key_phrases (word, meaning_vn).\n"
        "Return ONLY valid JSON."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "level": level,
        "topic_type": topic_type,
    }, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        result["status"] = "success"
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)
    finally:
        pass


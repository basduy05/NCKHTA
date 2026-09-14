import json
import time
import re
import asyncio
from typing import List, Dict, Optional, Any
from langchain_core.prompts import PromptTemplate

from .providers import (
    get_llm, _safe_invoke, _safe_invoke_async, _safe_astream, 
    ai_semaphore, parse_json_response, truncate_context
)
from ...database import log_ai_request
from ..referee_service import trigger_evaluation

async def evaluate_writing(text: str, task_type: str = "essay", target_test: str = "IELTS"):
    """Evaluate writing using IELTS/TOEIC criteria. Returns band score + detailed feedback."""
    llm = get_llm(difficulty="hard")
    if not llm:
        return {"error": "LLM not configured"}

    prompt = PromptTemplate.from_template(
        "You are an expert {target_test} writing examiner.\n"
        "Evaluate the following {task_type} writing:\n\n"
        "STUDENT'S WRITING:\n{text}\n\n"
        "Evaluate based on these criteria and return a JSON object:\n"
        '"overall_band": overall band score (1-9 for IELTS, or percentage)\n'
        '"word_count": actual word count\n'
        '"criteria": object with scores for each criterion:\n'
        '  "task_achievement": {{"score": number, "feedback_vn": detailed feedback in Vietnamese}}\n'
        '  "coherence_cohesion": {{"score": number, "feedback_vn": detailed feedback}}\n'
        '  "lexical_resource": {{"score": number, "feedback_vn": detailed feedback}}\n'
        '  "grammar_accuracy": {{"score": number, "feedback_vn": detailed feedback}}\n'
        '"strengths": array of 2-3 strengths in Vietnamese\n'
        '"improvements": array of 3-4 specific suggestions for improvement in Vietnamese\n'
        '"inline_annotations": array of objects with keys: {{"original", "issue_type", "improved", "explanation_vn"}} for inline rewrite coaching\n'
        '"corrected_sentences": array of objects showing corrections:\n'
        "CRITICAL: 'explanation_vn', 'feedback_vn', and 'description_vn' MUST be plain strings, NOT objects.\n"
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {
                "text": text[:2000],
                "task_type": task_type,
                "target_test": target_test,
            }, difficulty="hard", feature="Writing Evaluation")
            result = parse_json_response(response.content)
            if isinstance(result, dict):
                return result
            return {"error": "Could not evaluate writing"}
    except Exception as e:
        print(f"evaluate_writing error: {e}")
        return {"error": str(e)}


async def evaluate_writing_stream(text: str, task_type: str = "essay", target_test: str = "IELTS"):
    """Streaming version of evaluate_writing."""
    llm = get_llm(difficulty="hard")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return

    prompt = PromptTemplate.from_template(
        "You are an expert {target_test} writing examiner.\n"
        "Evaluate the following {task_type} writing:\n\n"
        "STUDENT'S WRITING:\n{text}\n\n"
        "Requirements:\n"
        "1. Provide a band score or percentage based on official {target_test} standards.\n"
        "2. Break down the evaluation into detailed criteria (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).\n"
        "3. Provide feedback for EACH criterion in Vietnamese.\n"
        "4. Include specific corrected sentences with explanations in Vietnamese.\n"
        "5. Provide a high-quality model paragraph for comparison.\n\n"
        "Return a JSON object with this structure:\n"
        '- "overall_band": number\n'
        '- "word_count": number\n'
        '- "criteria": {{"task_achievement": {{"score": n, "feedback_vn": "..."}}, "coherence_cohesion": {{"score": n, "feedback_vn": "..."}}, "lexical_resource": {{"score": n, "feedback_vn": "..."}}, "grammar_accuracy": {{"score": n, "feedback_vn": "..."}}}}\n'
        '- "strengths": ["...", "..." in Vietnamese]\n'
        '- "improvements": ["...", "..." in Vietnamese]\n'
        '- "inline_annotations": [{{"original": "...", "issue_type": "...", "improved": "...", "explanation_vn": "..."}}]\n'
        '- "corrected_sentences": [{{"original": "...", "corrected": "...", "explanation_vn": "..."}}]\n'
        '- "model_paragraph": "text content"\n\n'
        "Return ONLY the raw JSON object. No markdown."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "target_test": target_test,
        "task_type": task_type,
        "text": text,
    }, difficulty="hard"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        result["status"] = "success"
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)



async def generate_personalized_roadmap_stream(user_info: dict, words: List[dict]):
    """Streaming version of generate_personalized_roadmap."""
    llm = get_llm(difficulty="hard")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return
    
    goal = user_info.get("target_goal", "General English")
    level = user_info.get("current_level", "B1")
    words_summary = ", ".join([w['word'] for w in words[:20]])
    
    prompt = PromptTemplate.from_template(
        "You are an expert AI Education Advisor.\n"
        "Create a personalized English learning roadmap for a student with these details:\n"
        "- Current Level: {level}\n"
        "- Target Goal: {goal}\n"
        "- Recently Learned Words: {words}\n\n"
        "Return a JSON object with title, summary_vn, phases (name, duration, tasks_vn, focus_topics), and tips_vn.\n"
        "Return ONLY the raw JSON object."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "level": level,
        "goal": goal,
        "words": words_summary,
    }, difficulty="hard"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)



async def grade_writing_assignment(prompt_text: str, student_answer: str, test_type: str = "IELTS"):
    """Grade a writing assignment (IELTS or TOEIC) and return detailed feedback."""
    llm = get_llm(difficulty="hard")
    if not llm: return {"id": "error", "error": "LLM not configured"}
    
    prompt = PromptTemplate.from_template(
        "You are an expert {test_type} Writing examiner. Evaluate the following student essay.\n\n"
        "Prompt/Question: {prompt_text}\n\n"
        "Student Answer:\n{student_answer}\n\n"
        "Provide a detailed evaluation in perfectly formatted JSON. Use the following structure:\n"
        "{{\n"
        "  \"score\": 7.0, (Overall band score for IELTS, or a numerical score for TOEIC)\n"
        "  \"feedback_summary\": \"A short paragraph summarizing the overall performance.\",\n"
        "  \"criteria_scores\": {{\n"
        "    \"Task Achievement / Response\": 7.0,\n"
        "    \"Coherence and Cohesion\": 7.0,\n"
        "    \"Lexical Resource\": 6.5,\n"
        "    \"Grammatical Range and Accuracy\": 7.5\n"
        "  }},\n"
        "  \"detailed_feedback\": [\n"
        "    {{\"category\": \"Strengths\", \"points\": [\"...\", \"...\"]}},\n"
        "    {{\"category\": \"Weaknesses\", \"points\": [\"...\", \"...\"]}},\n"
        "    {{\"category\": \"Suggestions for Improvement\", \"points\": [\"...\", \"...\"]}}\n"
        "  ],\n"
        "  \"corrected_version\": \"A grammatically corrected and slightly improved version of the student's essay (keep their original voice as much as possible, just fix errors and smooth out phrasing).\"\n"
        "}}\n"
    )
    chain = prompt | llm
    print(f"[LLM WRITING GRADING] Grading {test_type} essay...", flush=True)
    try:
        response = await _safe_invoke_async(chain, {"test_type": test_type, "prompt_text": prompt_text, "student_answer": student_answer}, difficulty="hard", feature="Writing Grading")
        result = parse_json_response(response.content)
        print(f"[LLM WRITING GRADING] Success", flush=True)
        return result
    except Exception as e:
        print(f"[LLM WRITING GRADING] Error: {e}", flush=True)
        return {"error": str(e)}

async def generate_personalized_roadmap(user_info: dict, words: List[dict]):
    """Generate a custom learning roadmap based on user's vocabulary and goals."""
    llm = get_llm(difficulty="hard")
    if not llm: return {"error": "LLM not configured"}
    
    goal = user_info.get("target_goal", "General English")
    level = user_info.get("current_level", "B1")
    words_summary = ", ".join([w['word'] for w in words[:20]])
    
    prompt = PromptTemplate.from_template(
        "You are an expert AI Education Advisor.\n"
        "Create a personalized English learning roadmap for a student with these details:\n"
        "- Current Level: {level}\n"
        "- Target Goal: {goal}\n"
        "- Recently Learned Words: {words}\n\n"
        "Return a JSON object with this structure:\n"
        "{{\n"
        "  \"title\": \"Catchy title for the roadmap\",\n"
        "  \"summary_vn\": \"Brief overview in Vietnamese (2-3 sentences)\",\n"
        "  \"phases\": [\n"
        "    {{\n"
        "      \"name\": \"Phase name (e.g. Vocabulary Expansion)\",\n"
        "      \"duration\": \"Estimated time (e.g. 2 weeks)\",\n"
        "      \"tasks_vn\": [\"Task 1 in Vietnamese\", \"Task 2\"],\n"
        "      \"focus_topics\": [\"Topic 1\", \"Topic 2\"]\n"
        "    }}\n"
        "  ],\n"
        "  \"tips_vn\": [\"Tip 1\", \"Tip 2\"],\n"
        "  \"estimated_completion\": \"e.g. 3 months\"\n"
        "}}\n"
        "Ensure the roadmap is practical, encouraging, and highly relevant to the student's goal.\n"
        "Return ONLY the JSON."
    )
    
    chain = prompt | llm
    print(f"[LLM ROADMAP] Generating for goal: {goal}...", flush=True)
    try:
        response = await _safe_invoke_async(chain, {
            "level": level,
            "goal": goal,
            "words": words_summary,
        }, difficulty="hard", feature="Personalized Roadmap")
        return parse_json_response(response.content)
    except Exception as e:
        print(f"[LLM ROADMAP] Error: {e}")
        return {"error": "Failed to generate roadmap"}

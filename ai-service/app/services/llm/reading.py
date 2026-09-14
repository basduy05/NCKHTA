import json
import time
import re
import asyncio
from typing import List, Dict, Optional, Any
from langchain_core.prompts import PromptTemplate

from .providers import (
    get_llm, _safe_invoke, _safe_invoke_async, _safe_astream, 
    ai_semaphore, parse_json_response
)
from ...database import log_ai_request

async def generate_reading_passage(topic: str = "", level: str = "B1"):
    """Generate a reading passage with comprehension questions."""
    llm = get_llm(difficulty="medium")
    if not llm:
        return {"error": "LLM not configured"}

    prompt = PromptTemplate.from_template(
        "Generate an English reading comprehension exercise at CEFR level {level}.\n"
        "Topic: {topic}\n\n"
        "Return a JSON object with:\n"
        '"title": passage title\n'
        '"passage": the reading passage (200-400 words, CEFR {level})\n'
        '"word_count": number of words\n'
        '"key_vocabulary": array of 5-6 important words, each with:\n'
        '  "word": the word\n'
        '  "meaning_vn": Vietnamese meaning\n'
        '  "in_context": the sentence from passage containing this word\n'
        '"questions": array of 5-6 comprehension questions, each with:\n'
        '  "type": "mcq" or "true_false" or "short_answer"\n'
        '  "question": question text\n'
        '  "options": array of 4 choices (for mcq)\n'
        '  "correct_answer": correct answer\n'
        '  "explanation_vn": explanation in Vietnamese\n'
        '"summary_vn": Vietnamese summary of the passage\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    chain = prompt | llm
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {
                "level": level,
                "topic": topic or "an interesting general topic",
            }, difficulty="medium", feature="Reading Passage")
            result = parse_json_response(response.content)
            if isinstance(result, dict):
                return result
            return {"error": "Could not generate reading passage"}
    except Exception as e:
        print(f"generate_reading_passage error: {e}")
        return {"error": str(e)}


async def generate_reading_passage_stream(topic: str = "", level: str = "B1"):
    """Streaming version of generate_reading_passage."""
    llm = get_llm(difficulty="medium")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return

    prompt = PromptTemplate.from_template(
        "Generate an English reading comprehension exercise at CEFR level {level}.\n"
        "Topic: {topic}\n\n"
        "Return JSON with title, passage, word_count, key_vocabulary, questions, summary_vn.\n"
        "Return ONLY valid JSON."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "level": level,
        "topic": topic or "an interesting general topic",
    }, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        result["status"] = "success"
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)


async def generate_reading_comprehension(article_title: str, article_content: str, difficulty: str = "Medium", num_questions: int = 5):
    """Generate a reading comprehension test from a news article."""
    llm = get_llm(difficulty="medium")
    if not llm: 
        return {"error": "LLM not configured"}
    
    prompt = PromptTemplate.from_template(
        "You are an expert English teacher. Create a reading comprehension test for the following article.\n\n"
        "Title: {title}\n"
        "Content: {content}\n\n"
        "Difficulty Level: {difficulty}\n"
        "Number of Questions: {num_questions}\n\n"
        "Please generate {num_questions} questions. Include a mix of Multiple Choice, True/False/Not Given, and Vocabulary in Context questions. "
        "Return the output as a JSON object with the following structure:\n"
        "{{\n"
        "  \"passage\": \"The provided article content or a slightly adapted version for the difficulty level\",\n"
        "  \"questions\": [\n"
        "    {{\n"
        "      \"type\": \"multiple_choice|tfng|vocab\",\n"
        "      \"question\": \"Question text\",\n"
        "      \"options\": [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"], (only if multiple choice or vocab)\n"
        "      \"correct_answer\": \"The exact correct option or True/False/Not Given\",\n"
        "      \"explanation\": \"Why this is correct\"\n"
        "    }}\n"
        "  ]\n"
        "}}\n"
        "Ensure the JSON is perfectly formatted."
    )
    chain = prompt | llm
    print(f"[LLM READING COMPREHENSION] Generating for article: {article_title}...", flush=True)
    try:
        response = await _safe_invoke_async(chain, {
            "title": article_title, 
            "content": article_content, 
            "difficulty": difficulty,
            "num_questions": num_questions
        }, difficulty="medium", feature="Reading Comprehension")
        result = parse_json_response(response.content)
        print(f"[LLM READING COMPREHENSION] Success", flush=True)
        return result
    except Exception as e:
        print(f"[LLM READING COMPREHENSION] Error: {e}", flush=True)
        return {"error": str(e)}


async def generate_reading_comprehension_stream(article_title: str, article_content: str, difficulty: str = "Medium", num_questions: int = 5):
    """Streaming version of generate_reading_comprehension."""
    llm = get_llm(difficulty="medium")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return
        
    prompt = PromptTemplate.from_template(
        "You are an expert English teacher. Create a reading comprehension test for the following article.\n\n"
        "Title: {title}\n"
        "Content: {content}\n\n"
        "Difficulty Level: {difficulty}\n"
        "Number of Questions: {num_questions}\n\n"
        "Please generate {num_questions} questions. Include a mix of Multiple Choice, True/False/Not Given, and Vocabulary in Context.\n"
        "Return a JSON object with passage and questions (type, question, options, correct_answer, explanation).\n"
        "Return ONLY the raw JSON object."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {
        "title": article_title, 
        "content": article_content, 
        "difficulty": difficulty, 
        "num_questions": num_questions
    }, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)

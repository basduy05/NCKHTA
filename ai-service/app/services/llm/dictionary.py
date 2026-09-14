import json
import time
import re
import asyncio
import requests
import httpx
from typing import List, Dict, Optional, Any
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
import json_repair

from .schemas import FlashcardSchema, VocabListSchema
from .cache import _cache_get, _cache_set, is_data_complete, _dict_cache, _cache_lock
from .providers import (
    get_llm, _safe_invoke, _safe_invoke_async, _safe_astream, 
    ai_semaphore, parse_json_response, truncate_context, _is_local_fast_mode,
    get_queue_status
)
from ...database import get_db, get_setting, log_ai_request
from ...utils.resilience import retry
from ..referee_service import trigger_evaluation

async def generate_flashcard_content(word: str, level: str = "A1"):
    llm = get_llm(difficulty="easy")
    if not llm:
        return {
            "word": word,
            "definition": "Definition not available (Configure API Key)",
            "example": "Example not available"
        }
        
    parser = PydanticOutputParser(pydantic_object=FlashcardSchema)
    
    prompt = PromptTemplate(
        template=(
            "Generate a flashcard for the English word '{word}' suitable for level '{level}'.\n\n"
            "{format_instructions}\n"
        ),
        input_variables=["word", "level"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {"word": word, "level": level}, difficulty="easy", feature="Flashcard")
            result = parser.invoke(response)
            return result.model_dump()
    except Exception as e:
        print(f"generate_flashcard_content error: {e}")
        if 'response' in locals() and hasattr(response, 'content'):
            res = parse_json_response(response.content)
            if isinstance(res, dict) and "definition" in res:
                return res
        return {
            "word": word,
            "definition": f"Error generating content: {str(e)}",
            "example": ""
        }

from langchain_core.output_parsers import PydanticOutputParser

async def extract_vocabulary_from_text(text: str):
    """
    Uses LLM to analyse text and extract key vocabulary words with metadata.
    Essential for the 'Input Text -> Learn' feature.
    Guaranteed JSON schema output via PydanticOutputParser.
    """
    llm = get_llm(difficulty="easy")
    if not llm:
        return [{"word": "Error", "meaning": "LLM not configured"}]
        
    num = 10
    parser = PydanticOutputParser(pydantic_object=VocabListSchema)
    
    prompt = PromptTemplate(
        template=(
            "You are an expert English linguist and teacher.\n"
            "Analyze the following text and extract exactly {num} important vocabulary words/terms for a student to learn.\n\n"
            "TEXT:\n{text}\n\n"
            "SELECTION CRITERIA:\n"
            "1. Prioritize academic, professional, or complex words that appear in the text.\n"
            "2. Do NOT include basic words (like 'the', 'is', 'happy') unless used in a technical sense.\n"
            "3. Ensure the word/phrase is SPELLED EXACTLY as it appears in the text.\n\n"
            "{format_instructions}\n"
        ),
        input_variables=["num", "text"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )

    chain = prompt | llm
    try:
        async with ai_semaphore:
            response = await _safe_invoke_async(chain, {"text": text, "num": num}, difficulty="easy", feature="Vocab Extraction")
            # Parse text into Pydantic model
            result = parser.invoke(response)
            # Convert List[VocabItemSchema] -> List[dict]
            return [item.model_dump() for item in result.items]
    except Exception as e:
        print(f"extract_vocabulary error: {e}")
        # Fallback to old parsing if OutputParser fails due to hallucination
        if 'response' in locals() and hasattr(response, 'content'):
            res = parse_json_response(response.content)
            if isinstance(res, list) and len(res) > 0:
                try: 
                    # Try to map fields correctly if nested in 'items'
                    if isinstance(res, dict) and "items" in res:
                        return res["items"]
                    return res
                except: pass
        return [{"word": "Error", "meaning_vn": str(e), "pos": "", "meaning_en": "", "example": "", "level": "", "phonetic": ""}]


def generate_example_sentence(word: str, meaning: str = "", level: str = "B1"):
    llm = get_llm(difficulty="easy")
    if not llm:
        return f"Example for {word} (Auto-generated placeholder)"

    prompt = PromptTemplate.from_template(
        "Generate a short, clear English example sentence for the word '{word}' (meaning: '{meaning}') at CEFR level {level}. Return ONLY the sentence text, no quotes."
    )

    chain = prompt | llm
    try:
        response = _safe_invoke(chain, {"word": word, "meaning": meaning, "level": level}, feature="Example Sentence")
        return response.content
    except Exception as e:
        print(f"LLM Error: {e}")
        return f"This is an example sentence for {word}."


# ─── FREE DICTIONARY API INTEGRATION ─────────────────────────────────────────
import requests

_FREE_DICT_CIRCUIT = {"failures": 0, "open_until": 0.0}

def lookup_free_dictionary(word: str):
    """
    Look up a word using the Free Dictionary API (dictionaryapi.dev).
    Returns structured data with all meanings, phonetics, examples.
    Includes circuit breaker and fast timeout to prevent blocking.
    """
    now = time.time()
    if now < _FREE_DICT_CIRCUIT["open_until"]:
        return None

    start_time = time.time()
    try:
        url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=2.0)
        if resp.status_code != 200:
            return None
        
        _FREE_DICT_CIRCUIT["failures"] = 0
        entries = resp.json()
        if not isinstance(entries, list) or len(entries) == 0:
            return None
        
        entry = entries[0]  # Primary entry
        
        # Extract phonetics
        phonetic_uk = ""
        phonetic_us = ""
        audio_url = ""
        for p in entry.get("phonetics", []):
            text = p.get("text", "")
            audio = p.get("audio", "")
            if audio and not audio_url:
                audio_url = audio  # Take the first available audio
            if not text:
                continue
            if "uk" in audio.lower() or (not phonetic_uk and not audio):
                phonetic_uk = text
            if "us" in audio.lower() or (not phonetic_us and "uk" not in audio.lower()):
                phonetic_us = text
                if audio:
                     audio_url = audio # Prefer US audio if available
        if not phonetic_uk:
            phonetic_uk = entry.get("phonetic", "")
        if not phonetic_us:
            phonetic_us = phonetic_uk
        
        # Extract ALL meanings across all entries
        meanings = []
        primary_pos = ""
        for e in entries:
            for m in e.get("meanings", []):
                pos = m.get("partOfSpeech", "")
                if not primary_pos:
                    primary_pos = pos
                
                for defn in m.get("definitions", []):
                    meaning_obj = {
                        "pos": pos,
                        "definition_en": defn.get("definition", ""),
                        "definition_vn": "",  # Will be filled by AI
                        "examples": [],
                        "synonyms": defn.get("synonyms", [])[:3] or m.get("synonyms", [])[:3],
                        "antonyms": defn.get("antonyms", [])[:2] or m.get("antonyms", [])[:2],
                        "register": None,
                    }
                    if defn.get("example"):
                        meaning_obj["examples"].append(defn["example"])
                    meanings.append(meaning_obj)
        
        if not meanings:
            return None
        
        return {
            "word": word,
            "phonetic_uk": phonetic_uk,
            "phonetic_us": phonetic_us,
            "audio_url": audio_url,
            "pos": primary_pos,
            "meanings": meanings,
            "level": "",  # Will be estimated by AI
            "word_family": [],
            "collocations": [],
            "sources": ["Free Dictionary API (Wiktionary)"],
            "_needs_translation": True,  # Flag: needs Vietnamese translation
        }
    except Exception as e:
        _FREE_DICT_CIRCUIT["failures"] += 1
        if _FREE_DICT_CIRCUIT["failures"] >= 2:
            _FREE_DICT_CIRCUIT["open_until"] = time.time() + 180.0
            print(f"[Free Dictionary API] Circuit breaker OPEN for 180s due to repeated errors ({e})")
        else:
            print(f"[Free Dictionary API] Error: {e}")
        return None
    finally:
        if 'start_time' in locals():
             print(f"[LATENCY] lookup_free_dictionary for '{word}' took {time.time() - start_time:.2f}s")



def lookup_wikipedia(word: str) -> dict:
    """
    Look up a word using Wikipedia API (FREE, no API key needed).
    Returns summary and additional information from Wikipedia.
    """
    try:
        # Use Wikipedia REST API (free, no key required)
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{word.lower()}"
        resp = requests.get(url, timeout=2.0)
        
        if resp.status_code != 200:
            # Try with disambiguation
            url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={word}&limit=1&format=json"
            resp = requests.get(url, timeout=2.0)
            if resp.status_code == 200:
                data = resp.json()
                if len(data) > 1 and len(data[1]) > 0:
                    # Get first result
                    title = data[1][0]
                    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
                    resp = requests.get(url, timeout=2.0)
                else:
                    return None
            else:
                return None
        
        data = resp.json()
        
        return {
            "title": data.get("title", ""),
            "extract": data.get("extract", ""),  # Summary text
            "description": data.get("description", ""),
            "thumbnail": data.get("thumbnail", {}).get("source", "") if data.get("thumbnail") else "",
            "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            "wikipedia_source": True
        }
    except Exception as e:
        print(f"[Wikipedia API] Error: {e}")
        return None

def translate_meanings_with_ai(word: str, meanings: list, estimate_level: bool = True):
    start_time = time.time()
    """
    Use AI as multi-source lexicographer (Cambridge, Oxford, Merriam-Webster, Longman, Urban Dictionary)
    to translate, consolidate, and enrich raw Free Dictionary API data.
    Adds: register (formal/informal/slang), frequency, usage_notes, idioms.
    """
    llm = get_llm(difficulty="easy")
    if not llm:
        return meanings, "B1", [], [], []
    
    # Build compact representation of all meanings from Free API
    definitions_text = "\n".join(
        f"{i+1}. [{m.get('pos', '')}] {m.get('definition_en', '')} (Examples: {m.get('examples', [])})"
        for i, m in enumerate(meanings[:20])
    )
    
    prompt = PromptTemplate.from_template(
        "You are an expert bilingual lexicographer combining knowledge from Cambridge Dictionary, "
        "Oxford Advanced Learner's Dictionary, Merriam-Webster, Longman, Collins, Macmillan, "
        "and Urban Dictionary (for slang/informal usage).\n"
        "I have raw dictionary meanings for the English word '{word}'.\n"
        "Your task is to consolidate into 4-6 distinct grouped meanings, BUT also ADD any important "
        "meanings that are MISSING from the raw data (especially slang, informal, or specialized meanings).\n"
        "**CRITICAL:** Sort the meanings by relevance and frequency. The MOST COMMON and SAT NGHĨA (most accurate/direct) meanings MUST be listed FIRST.\n\n"
        "Raw Definitions:\n{definitions}\n\n"
        "For EACH distinct meaning, provide ALL of these fields (NEVER leave any empty):\n"
        "1. 'pos' — part of speech\n"
        "2. 'definition_en' — clean English definition\n"
        "3. 'definition_vn' — natural Vietnamese translation\n"
        "4. 'examples' — 2-3 realistic example sentences. MUST have at least 2.\n"
        "5. 'synonyms' — 3-5 synonyms\n"
        "6. 'antonyms' — 2-3 antonyms (empty array if none)\n"
        "7. 'register' — one of: 'formal', 'informal', 'slang', 'technical', 'literary', 'neutral'\n"
        "8. 'usage_notes' — brief note on when/how to use this meaning (e.g. 'common in spoken English')\n\n"
        "Also provide:\n"
        "- 'level': CEFR level (A1-C2)\n"
        "- 'frequency': 'very common', 'common', 'uncommon', or 'rare'\n"
        "- 'word_family': 5-8 related word forms (e.g. run → runner, running, ran)\n"
        "- 'collocations': 5-8 common collocations\n"
        "- 'idioms': 2-4 idioms with Vietnamese translations\n\n"
        "Return EXACTLY a JSON object:\n"
        '{{\n'
        '  "meanings": [{{"pos": "...", "definition_en": "...", "definition_vn": "...", '
        '"examples": ["..."], "synonyms": ["..."], "antonyms": ["..."], '
        '"register": "neutral", "usage_notes": "..."}}],\n'
        '  "level": "B1",\n'
        '  "frequency": "common",\n'
        '  "word_family": ["..."],\n'
        '  "collocations": ["..."],\n'
        '  "idioms": [{{"idiom": "...", "meaning_vn": "..."}}]\n'
        '}}\n\n'
        "CRITICAL: Every English field must have a high-quality Vietnamese translation in 'definition_vn' and 'meaning_vn'. These fields MUST be a plain string, NO nested objects.\n"
        "Return ONLY valid JSON. No markdown."
    )
    
    chain = prompt | llm

    @retry(tries=2, delay=2.0)
    def _invoke_with_retry():
        try:
            return _safe_invoke(chain, {"word": word, "definitions": definitions_text}, difficulty="easy", feature="Dictionary Translation")
        except Exception as e:
            raise e

    try:
        response = _invoke_with_retry()
        result = parse_json_response(response.content)
        
        if isinstance(result, dict) and "meanings" in result:
            return (
                result["meanings"],
                result.get("level", "B1"),
                result.get("word_family", []) or [],
                result.get("collocations", []) or [],
                result.get("idioms", []) or []
            )
        elif isinstance(result, list) and len(result) > 0:
            # If result is a list of meanings, use it directly
            return (
                result,
                "B1",
                [],
                [],
                []
            )
    except Exception as e:
        print(f"[AI Translation & Consolidation] Error: {e}")
    finally:
        print(f"[LATENCY] translate_meanings_with_ai for '{word}' took {time.time() - start_time:.2f}s")
    
    # Return original meanings with defaults instead of empty arrays
    return meanings, "B1", [], [], []

async def translate_meanings_with_ai_stream(word: str, meanings: list, free_data: dict = None, estimate_level: bool = True):
    """
    Streaming version of translate_meanings_with_ai. Yields JSON chunks as they arrive.
    Takes optional free_data to preserve phonetics and other metadata from Free Dictionary API.
    """
    start_time = time.time()
    llm = get_llm(difficulty="easy")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return
    
    # Pre-populate phonetics and audio from free_data to enable fast first byte
    phonetic_uk = ""
    phonetic_us = ""
    audio_url = ""
    if free_data:
        phonetic_uk = free_data.get("phonetic_uk", "")
        phonetic_us = free_data.get("phonetic_us", "")
        audio_url = free_data.get("audio_url", "")
    
    # Fast first byte: yield initial structure if we have some data
    if free_data:
        yield json.dumps({
            "status": "thinking",
            "word": word,
            "phonetic_uk": phonetic_uk,
            "phonetic_us": phonetic_us,
            "audio_url": audio_url,
            "elapsed": 0.1
        }, ensure_ascii=False) + "\n"

    definitions_text = "\n".join(
        f"{i+1}. [{m.get('pos', '')}] {m.get('definition_en', '')} (Examples: {m.get('examples', [])})"
        for i, m in enumerate(meanings[:20])
    )
    
    # Full comprehensive prompt for complete vocabulary data
    prompt = PromptTemplate.from_template(
        "You are an expert bilingual lexicographer combining knowledge from Cambridge Dictionary, "
        "Oxford Advanced Learner's Dictionary, Merriam-Webster, Longman, Collins, Macmillan, "
        "and Urban Dictionary (for slang/informal usage).\n"
        "I have raw dictionary meanings for the English word '{word}'.\n"
        "Your task is to consolidate into 4-6 distinct grouped meanings, BUT also ADD any important "
        "meanings that are MISSING from the raw data (especially slang, informal, or specialized meanings).\n\n"
        "Raw Definitions:\n{definitions}\n\n"
        "For EACH distinct meaning, provide ALL of these fields (NEVER leave any empty):\n"
        "1. 'pos' — part of speech\n"
        "2. 'definition_en' — clean English definition\n"
        "3. 'definition_vn' — accurate and natural Vietnamese translation (MANDATORY)\n"
        "4. 'examples' — 2-3 realistic example sentences. EACH sentence must be followed by its Vietnamese translation. Format: ['English sentence | Dịch tiếng Việt', ...]. MUST have at least 2.\n"
        "5. 'synonyms' — 3-5 synonyms\n"
        "6. 'antonyms' — 2-3 antonyms (empty array if none)\n"
        "7. 'register' — one of: 'formal', 'informal', 'slang', 'technical', 'literary', 'neutral'\n"
        "8. 'usage_notes' — brief note on when/how to use this meaning (e.g. 'common in spoken English')\n\n"
        "Also provide:\n"
        "- 'phonetic_uk' — UK phonetic pronunciation (e.g. /kəmˈpjuːtər/)\n"
        "- 'phonetic_us' — US phonetic pronunciation (e.g. /kəmˈpjuːtər/)\n"
        "- 'audio_url_uk' — URL to UK pronunciation audio (from dictionaryapi.dev if available)\n"
        "- 'audio_url_us' — URL to US pronunciation audio (from dictionaryapi.dev if available)\n"
        "- 'level': CEFR level (A1-C2)\n"
        "- 'frequency': 'very common', 'common', 'uncommon', or 'rare'\n"
        "- 'word_family': 5-8 related word forms (e.g. run → runner, running, ran)\n"
        "- 'collocations': 5-8 common collocations with example sentences\n"
        "- 'idioms': 2-4 idioms with Vietnamese translations\n"
        "- 'notes': additional notes about usage\n\n"
        "Return EXACTLY a JSON object:\n"
        '{{\n'
        '  "word": "...",\n'
        '  "phonetic_uk": "...",\n'
        '  "phonetic_us": "...",\n'
        '  "audio_url_uk": "...",\n'
        '  "audio_url_us": "...",\n'
        '  "meanings": [{{"pos": "...", "definition_en": "...", "definition_vn": "...", '
        '"examples": ["..."], "examples_vn": ["..."], "synonyms": ["..."], "antonyms": ["..."], '
        '"register": "neutral", "usage_notes": "..."}}],\n'
        '  "level": "B1",\n'
        '  "frequency": "common",\n'
        '  "word_family": ["..."],\n'
        '  "collocations": ["..."],\n'
        '  "idioms": [{{"idiom": "...", "meaning_vn": "...", "example": "..."}}],\n'
        '  "notes": "...",\n'
        '  "sources": ["Cambridge Dictionary", "Oxford Advanced Learner", "Merriam-Webster", "Longman", "Urban Dictionary"]\n'
        '}}\n\n'
        "Return ONLY valid JSON. No markdown."
    )
    
    chain = prompt | llm
    
    async def _safe_stream_invoke(chain_to_use, params, llm_name="Primary"):
        try:
            if hasattr(chain_to_use, 'astream'):
                async for chunk in chain_to_use.astream(params):
                    yield chunk.content
            else:
                for chunk in chain_to_use.stream(params):
                    yield chunk.content
        except Exception as e:
            if llm_name == "Primary":
                print(f"[LLM ERROR] Primary LLM failed in stream with error: {e}. Falling back to Cohere...")
                fallback_llm = get_llm(provider="cohere")
                if fallback_llm and hasattr(chain_to_use, 'first'):
                    fallback_chain = chain_to_use.first | fallback_llm
                    async for c in _safe_stream_invoke(fallback_chain, params, llm_name="Cohere"):
                        yield c
                    return
            raise e

    try:
        accumulated_text = ""
        last_yielded_json = ""
        chunk_count = 0
        
        async with ai_semaphore:
            async for content in _safe_stream_invoke(chain, {"word": word, "definitions": definitions_text}):
                if content:
                    # Vietnamese font fix: DO NOT use encode('utf-8').decode('unicode_escape')
                    # It corrupts raw UTF-8 characters. 
                    # LLMs today output raw UTF-8 by default.
                    
                    accumulated_text += content
                    elapsed = time.time() - start_time
                    chunk_count += 1
                    
                    # Yield raw thinking chunk
                    yield json.dumps({
                        "status": "thinking", 
                        "chunk": content, 
                        "full_thinking": accumulated_text,
                        "elapsed": round(elapsed, 1),
                        "queue": get_queue_status()
                    }, ensure_ascii=False) + "\n"
                
                # Fast & smooth incremental repair: trigger whenever a JSON structure element completes or every 5 chunks
                if chunk_count % 5 == 0 or "}" in content or "]" in content or len(content) > 50:
                    try:
                        repaired = json_repair.repair_json(accumulated_text, return_objects=True)
                        if isinstance(repaired, dict) and isinstance(repaired.get("meanings"), list) and len(repaired["meanings"]) > 0:
                            # Gắn thêm trường metadata
                            repaired["status"] = "result"
                            repaired["_source"] = "ai"  # Mark as AI-generated
                            repaired["_raw_thinking_stream"] = accumulated_text
                            repaired["elapsed"] = round(elapsed, 1)
                            
                            # Bổ sung phonetics từ Free Dictionary API nếu AI không trả về
                            if free_data:
                                if not repaired.get("phonetic_uk") and phonetic_uk:
                                    repaired["phonetic_uk"] = phonetic_uk
                                if not repaired.get("phonetic_us") and phonetic_us:
                                    repaired["phonetic_us"] = phonetic_us
                                if not repaired.get("audio_url_uk") and audio_url:
                                    repaired["audio_url_uk"] = audio_url
                                if not repaired.get("audio_url_us") and audio_url:
                                    repaired["audio_url_us"] = audio_url
                            
                            # Yield intermediate result
                            current_json = json.dumps(repaired, ensure_ascii=False)
                            if current_json != last_yielded_json:
                                yield current_json + "\n"
                                last_yielded_json = current_json
                    except Exception:
                        pass
        
        # Final absolute repair yield to ensure the client receives the complete results
        try:
            repaired = json_repair.repair_json(accumulated_text, return_objects=True)
            if isinstance(repaired, dict) and isinstance(repaired.get("meanings"), list):
                repaired["status"] = "result"
                repaired["_source"] = "ai"
                repaired["elapsed"] = round(time.time() - start_time, 1)
                if free_data:
                    if not repaired.get("phonetic_uk") and phonetic_uk:
                        repaired["phonetic_uk"] = phonetic_uk
                    if not repaired.get("phonetic_us") and phonetic_us:
                        repaired["phonetic_us"] = phonetic_us
                    if not repaired.get("audio_url_uk") and audio_url:
                        repaired["audio_url_uk"] = audio_url
                    if not repaired.get("audio_url_us") and audio_url:
                        repaired["audio_url_us"] = audio_url
                current_json = json.dumps(repaired, ensure_ascii=False)
                if current_json != last_yielded_json:
                    yield current_json + "\n"
        except Exception:
            pass
    except Exception as e:
        print(f"[AI Stream Translation] Error: {e}")
        yield json.dumps({"error": str(e)}) + "\n"
    finally:
         print(f"[LATENCY] translate_meanings_with_ai_stream for '{word}' TOTAL took {time.time() - start_time:.2f}s")

def lookup_dictionary_full_ai(word: str):
    start_time = time.time()
    """
    Full AI-powered dictionary lookup (fallback when Free API has no results).
    Used for abbreviations, slang, proper nouns, etc.
    Multi-source: Cambridge, Oxford, Merriam-Webster, Longman, Urban Dictionary.
    """
    llm = get_llm(difficulty="easy")
    if not llm:
        return {"word": word, "error": "LLM not configured"}

    prompt = PromptTemplate.from_template(
        "You are an advanced English dictionary combining data from Cambridge Dictionary, "
        "Oxford Advanced Learner's Dictionary, Longman, Collins, Macmillan, Merriam-Webster, "
        "AND Urban Dictionary (for slang/informal).\n"
        "Look up the English word/term: '{word}'\n\n"
        "IMPORTANT RULES:\n"
        "1. Group meanings logically. Provide 3-6 distinct meanings if the word has multiple senses.\n"
        "2. Cover ALL parts of speech (noun, verb, adj, etc.).\n"
        "3. If the word is an ABBREVIATION (like IT, AI, USA), include its full form as the FIRST meaning.\n"
        "4. If the word has BOTH a common meaning AND an abbreviation meaning, include BOTH.\n"
        "5. Include SLANG and INFORMAL meanings if they exist — mark them with register: 'slang' or 'informal'.\n"
        "6. Provide at least 2-3 natural example sentences for EVERY meaning. NEVER leave empty.\n"
        "7. Provide accurate IPA phonetics for both UK and US.\n\n"
        "Return a JSON object with these EXACT keys:\n"
        '"word": the word (preserve original casing)\n'
        '"phonetic_uk": UK IPA pronunciation\n'
        '"phonetic_us": US IPA pronunciation\n'
        '"pos": primary part of speech\n'
        '"meanings": array of objects, each with:\n'
        '  "pos", "definition_en", "definition_vn", "examples" (2-3),\n'
        '  "synonyms" (3-5), "antonyms" (0-3),\n'
        '  "register": "formal"/"informal"/"slang"/"technical"/"literary"/"neutral",\n'
        '  "usage_notes": brief contextual note\n'
        '"level": CEFR level (A1-C2)\n'
        '"frequency": "very common"/"common"/"uncommon"/"rare"\n'
        '"word_family": array of 5-8 related word forms\n'
        '"collocations": array of 5-8 common collocations\n'
        '"idioms": array of 2-4 idiom objects {{"idiom": "...", "meaning_vn": "..."}}\n'
        '"sources": ["Cambridge", "Oxford", "Longman", "Merriam-Webster", "Collins"]\n\n'
        "Return ONLY valid JSON. No markdown, no extra text."
    )

    chain = prompt | llm
    try:
        try:
            response = _safe_invoke(chain, {"word": word}, difficulty="easy", feature="Full Dictionary Lookup")
        except Exception as e:
            print(f"[LLM ERROR] Primary LLM failed in lookup_full with error: {e}. Retrying with Cohere...")
            fallback_llm = get_llm(provider="cohere")
            if fallback_llm:
                chain = prompt | fallback_llm
                response = _safe_invoke(chain, {"word": word}, feature="Full Dictionary Lookup")
            else:
                raise e

        # Ensure we return a default on unparseable JSON without crashing
        result = parse_json_response(response.content)
        if isinstance(result, dict) and "word" in result:
            if is_data_complete(result):
                _cache_set(word, result)
            return result
        return {"word": word, "error": "Could not parse dictionary data"}
    except Exception as e:
        print(f"lookup_dictionary_full_ai error: {e}")
        return {"word": word, "error": str(e)}

async def lookup_dictionary_full_ai_stream(word: str):
    """
    Streaming AI dictionary lookup. Yields JSON strings.
    """
    llm = get_llm(difficulty="easy")
    if not llm:
        yield json.dumps({"word": word, "error": "LLM not configured"})
        return

    prompt = PromptTemplate.from_template(
        "You are an advanced English dictionary combining data from Cambridge Dictionary, "
        "Oxford Advanced Learner's Dictionary, Longman, Collins, Macmillan, Merriam-Webster, "
        "AND Urban Dictionary (for slang/informal).\n"
        "Look up the English word/term: '{word}'\n\n"
        "IMPORTANT RULES:\n"
        "1. Group meanings logically. Provide 3-6 distinct meanings if the word has multiple senses.\n"
        "2. Cover ALL parts of speech (noun, verb, adj, etc.).\n"
        "3. If the word is an ABBREVIATION (like IT, AI, USA), include its full form as the FIRST meaning.\n"
        "4. If the word has BOTH a common meaning AND an abbreviation meaning, include BOTH.\n"
        "5. Include SLANG and INFORMAL meanings if they exist — mark them with register: 'slang' or 'informal'.\n"
        "6. Provide at least 2-3 natural example sentences for EVERY meaning. NEVER leave empty.\n"
        "7. Provide accurate IPA phonetics for both UK and US.\n\n"
        "Return a JSON object with these EXACT keys:\n"
        '"word": the word (preserve original casing)\n'
        '"phonetic_uk": UK IPA pronunciation\n'
        '"phonetic_us": US IPA pronunciation\n'
        '"pos": primary part of speech\n'
        '"meanings": array of objects, each with:\n'
        '  "pos", "definition_en", "definition_vn", "examples" (2-3),\n'
        '  "synonyms" (3-5), "antonyms" (0-3),\n'
        '  "register": "formal"/"informal"/"slang"/"technical"/"literary"/"neutral",\n'
        '  "usage_notes": brief contextual note\n'
        '"level": CEFR level (A1-C2)\n'
        '"frequency": "very common"/"common"/"uncommon"/"rare"\n'
        '"word_family": array of 5-8 related word forms\n'
        '"collocations": array of 5-8 common collocations\n'
        '"idioms": array of 2-4 idiom objects {{"idiom": "...", "meaning_vn": "..."}}\n'
        '"sources": ["Cambridge", "Oxford", "Longman", "Merriam-Webster", "Collins"]\n\n'
        "Return ONLY valid JSON. No markdown, no extra text."
    )

    chain = prompt | llm

    async def _safe_stream_invoke(chain_to_use, params, llm_name="Primary"):
        try:
            if hasattr(chain_to_use, 'astream'):
                async for chunk in chain_to_use.astream(params):
                    yield chunk.content
            else:
                for chunk in chain_to_use.stream(params):
                    yield chunk.content
        except Exception as e:
            if llm_name == "Primary":
                print(f"[LLM ERROR] Primary LLM failed in stream with error: {e}. Falling back to Cohere...")
                fallback_llm = get_llm(provider="cohere")
                if fallback_llm and hasattr(chain_to_use, 'first'):
                    fallback_chain = chain_to_use.first | fallback_llm
                    async for c in _safe_stream_invoke(fallback_chain, params, llm_name="Cohere"):
                        yield c
                    return
            raise e

    try:
        start_time = time.time()
        accumulated_text = ""
        last_yielded_json = ""
        chunk_count = 0
        async with ai_semaphore:
            async for content in _safe_stream_invoke(chain, {"word": word}):
                if content:
                    # Vietnamese font fix: DO NOT use encode('utf-8').decode('unicode_escape')
                    
                    accumulated_text += content
                    elapsed = time.time() - start_time
                    chunk_count += 1
                    
                    # Yield thinking status
                    yield json.dumps({
                        "status": "thinking",
                        "chunk": content,
                        "full_thinking": accumulated_text,
                        "elapsed": round(elapsed, 1),
                        "queue": get_queue_status()
                    }, ensure_ascii=False) + "\n"
                
                # Chỉ repair json mỗi 10 chunks
                if chunk_count % 10 == 0:
                    try:
                        repaired = json_repair.repair_json(accumulated_text, return_objects=True)
                        if isinstance(repaired, dict) and "word" in repaired and isinstance(repaired.get("meanings"), list):
                            repaired["status"] = "result"
                            repaired["_source"] = "ai"
                            repaired["elapsed"] = round(elapsed, 1)
                            
                            current_json = json.dumps(repaired, ensure_ascii=False)
                            if current_json != last_yielded_json:
                                yield current_json + "\n"
                                last_yielded_json = current_json
                    except Exception:
                        pass
        
        # Final absolute repair yield to ensure the client receives the complete results
        try:
            repaired = json_repair.repair_json(accumulated_text, return_objects=True)
            if isinstance(repaired, dict) and "word" in repaired and isinstance(repaired.get("meanings"), list):
                repaired["status"] = "result"
                repaired["_source"] = "ai"
                repaired["elapsed"] = round(time.time() - start_time, 1)
                current_json = json.dumps(repaired, ensure_ascii=False)
                if current_json != last_yielded_json:
                    yield current_json + "\n"
        except Exception:
            pass
    except Exception as e:
        print(f"lookup_dictionary_full_ai_stream error: {e}")
        yield json.dumps({"word": word, "error": str(e)}) + "\n"

def lookup_dictionary(word: str):
    """
    Hybrid dictionary lookup:
    1. Check in-memory cache (only if data is complete)
    2. Try Free Dictionary API first (free, accurate English data)
    3. Use AI for Vietnamese translation + enrichment (slang, register, collocations)
    4. Fallback to full AI if Free API doesn't have the word
    5. Try Wikipedia for additional context
    
    Only caches COMPLETE data (all fields filled).
    """
    # Check cache first — but only return if data is complete
    cached = _cache_get(word)
    if cached and is_data_complete(cached):
        cached["_from_cache"] = True
        # Also try to get Wikipedia data if not cached
        if not cached.get("wikipedia"):
            wikipedia_data = lookup_wikipedia(word)
            if wikipedia_data:
                cached["wikipedia"] = wikipedia_data
        return cached

    # Step 1: Try Free Dictionary API (free, comprehensive English data)
    free_data = lookup_free_dictionary(word)
    
    # Also try Wikipedia in parallel (for additional context)
    wikipedia_data = lookup_wikipedia(word)
    
    if free_data and len(free_data.get("meanings", [])) > 0:
        # Step 2: Use AI for translation + enrichment (slang, register, collocations)
        meanings, level, word_family, collocations, idioms = translate_meanings_with_ai(
            word, free_data["meanings"]
        )
        free_data["meanings"] = meanings
        free_data["level"] = level
        free_data["word_family"] = word_family if word_family else []
        free_data["collocations"] = collocations if collocations else free_data.get("collocations", [])
        # Preserve idioms from Free Dictionary API if AI returns empty
        free_data["idioms"] = idioms if idioms else free_data.get("idioms", [])
        free_data["sources"] = ["Free Dictionary API (Wiktionary)", "Cambridge", "Oxford", "Merriam-Webster"]
        free_data.pop("_needs_translation", None)
        
        # Add Wikipedia data if available
        if wikipedia_data:
            free_data["wikipedia"] = wikipedia_data
        
        # Only cache if data is complete
        if is_data_complete(free_data):
            _cache_set(word, free_data)
        return free_data
    
    # Step 3: Fallback to full AI (for abbreviations, slang, proper nouns)
    result = lookup_dictionary_full_ai(word)
    if not result.get("error") and is_data_complete(result):
        _cache_set(word, result)
    
    # Add Wikipedia data if available
    if wikipedia_data and result:
        result["wikipedia"] = wikipedia_data
    
    return result


async def lookup_dictionary_stream(word: str, free_data: dict = None, wikipedia_data: dict = None, force_ai: bool = False):
    """
    Streaming version of hybrid dictionary lookup.
    Yields JSON chunks.
    1. Check cache -> yields full JSON if complete
    2. Use provided free_data/wikipedia_data OR fetch if missing
    3. Use AI stream for translation + enrichment
    """
    import json
    from .. import graph_service
    
    # Pre-fetch graph connections early (even for cache misses)
    # This fixes the "second lookup" bug
    connections = graph_service.get_word_connections(word.lower())
    graph_connections = connections.get("connections", [])
    
    # Check cache first (only if NOT forcing AI)
    if not force_ai:
        cached = _cache_get(word)
        if cached and is_data_complete(cached):
            cached["_from_cache"] = True
            cached["status"] = "result"
            # Also try to get Wikipedia data if not cached
            if not cached.get("wikipedia"):
                wikipedia_data = lookup_wikipedia(word)
                if wikipedia_data:
                    cached["wikipedia"] = wikipedia_data
            yield json.dumps(cached, ensure_ascii=False)
            return
    else:
        # Clear in-memory cache for this word to ensure it does not get served again
        key = word.lower().strip()
        with _cache_lock:
            if key in _dict_cache:
                del _dict_cache[key]

    # Step 1: Resolve Dependencies (Use provided or fetch)
    if free_data is None:
        free_data = lookup_free_dictionary(word)
    
    if wikipedia_data is None:
        # Also try Wikipedia in parallel
        wikipedia_data = lookup_wikipedia(word)
    
    if free_data and len(free_data.get("meanings", [])) > 0:
        # Fast First Yield: render basic word card immediately in < 100ms
        preview_meanings = []
        for m in free_data.get("meanings", [])[:3]:
            preview_meanings.append({
                "pos": m.get("pos", "noun"),
                "definition_en": m.get("definition_en", ""),
                "definition_vn": m.get("definition_vn", "Đang phân tích nghĩa tiếng Việt với AI..."),
                "examples": m.get("examples", [])[:2],
                "synonyms": m.get("synonyms", [])[:4],
                "antonyms": m.get("antonyms", [])[:3],
            })
        instant_preview = {
            "status": "result",
            "word": word,
            "pos": free_data.get("pos", "noun"),
            "phonetic_uk": free_data.get("phonetic_uk", ""),
            "phonetic_us": free_data.get("phonetic_us", ""),
            "audio_url": free_data.get("audio_url", ""),
            "meanings": preview_meanings,
            "graph_connections": graph_connections,
            "wikipedia": wikipedia_data,
            "is_preview": True,
            "_source": "quick_preview",
            "elapsed": 0.05
        }
        yield json.dumps(instant_preview, ensure_ascii=False) + "\n"

        # Step 2: Use AI stream for translation + enrichment (pass full free_data to preserve phonetics)
        async for chunk in translate_meanings_with_ai_stream(word, free_data["meanings"], free_data):
            # Add Wikipedia and Graph data to the chunk if available
            if (wikipedia_data or graph_connections) and "wikipedia" not in chunk:
                try:
                    import json
                    chunk_data = json.loads(chunk)
                    if "error" not in chunk_data:
                        if wikipedia_data: chunk_data["wikipedia"] = wikipedia_data
                        if graph_connections: chunk_data["graph_connections"] = graph_connections
                        chunk = json.dumps(chunk_data, ensure_ascii=False)
                except:
                    pass
            yield chunk
        return
    
    # Step 3: Fallback to full AI stream
    async for chunk in lookup_dictionary_full_ai_stream(word):
        # Add Wikipedia and Graph data if available
        if (wikipedia_data or graph_connections) and "wikipedia" not in chunk:
            try:
                import json
                chunk_data = json.loads(chunk)
                if "error" not in chunk_data:
                    if wikipedia_data: chunk_data["wikipedia"] = wikipedia_data
                    if graph_connections: chunk_data["graph_connections"] = graph_connections
                    chunk = json.dumps(chunk_data, ensure_ascii=False)
            except:
                pass
        yield chunk
    return



# ═══════════════════════════════════════════════════════════════════════════════
# NEW FEATURES: IPA, File Exercises, TOEIC/IELTS, Reading, Writing, Speaking

async def generate_vocab_practice_rich(words: List[dict]):
    """Generate professional vocabulary exercises with hints and diverse types."""
    llm = get_llm(difficulty="medium")
    if not llm:
        return []
    
    words_info = "\n".join([f"- [ID: {w.get('id', i)}] {w['word']} ({w.get('meaning_en', '')})" for i, w in enumerate(words)])
    
    prompt = PromptTemplate(
        input_variables=["words"],
        template=(
            "You are a premium English language assessment designer.\n"
            "Create a challenging and meaningful vocabulary practice set for these words:\n{words}\n\n"
            "QUESTION TYPES TO INCLUDE (Mix them up):\n"
            "1. MCQ: Traditional multiple choice for definition or synonym.\n"
            "2. FIB: Fill in the blanks. Provide a `question` sentence with a '[blank]'. The `answer` must be the word being tested.\n"
            "3. SPELLING: Give a meaning or context, and ask the user to type the word exactly. No options needed.\n"
            "4. PARAPHRASE: Provide a sentence, ask the user to choose the option that has the closest meaning.\n"
            "5. MATCHING: Provide a list of terms and a list of definitions to be matched.\n\n"
            "REQUIREMENTS:\n"
            "- CRITICAL: Ensure ALL questions, options, and answers are **100% strictly in English**. DO NOT include any Vietnamese in them.\n"
            "- CRITICAL: For MCQ, FIB, and PARAPHRASE, the `answer` string MUST EXACTLY MATCH one of the strings in the `options` array.\n"
            "- For MATCHING, the `options` should be an array of definitions, and `answer` should be a corresponding array of words in the same order, OR a special `matching_pairs` field: [{{\"word\": \"...\", \"def\": \"...\"}}].\n"
            "- The only fields allowed to hold Vietnamese are `hint_vn` (required for all) and `explanation_vn` (brief Vietnamese explanation).\n"
            "- Each question MUST include the 'word_id' field matching the [ID: ...] provided in the list.\n"
            "- 'type': One of ['MCQ', 'FIB', 'SPELLING', 'PARAPHRASE', 'MATCHING'].\n\n"
            "Return a JSON object with an 'exercises' key containing an array of 10-15 objects with these keys: {{word_id, type, question, hint_vn, options, answer, matching_pairs, explanation_vn}}.\n"
            "Return ONLY the JSON. No markdown."
        )
    )
    chain = prompt | llm
    try:
        async with ai_semaphore:
            # Optimize: explicitly ask for a concise but high-quality response to reduce latency
            response = await _safe_invoke_async(chain, {"words": words_info, "num": 10}, difficulty="medium", feature="Vocab Practice")
            result = parse_json_response(response.content)
            
            # Ensure it's always an array wrapper if it's just a raw list
            if isinstance(result, list):
                return {"exercises": result}
            return result
    except Exception as e:
        print(f"[LLM VOCAB PRACTICE] ERROR: {e}", flush=True)
        return []

async def generate_vocab_practice_rich_stream(words: List[dict]):
    """Streaming version of generate_vocab_practice_rich."""
    llm = get_llm(difficulty="medium")
    if not llm:
        yield json.dumps({"error": "LLM not configured"})
        return
    
    words_info = "\n".join([f"- [ID: {w['id']}] {w['word']} ({w['meaning_en']})" for w in words])
    
    prompt = PromptTemplate.from_template(
        "You are a premium English language assessment designer.\n"
        "Create a challenging and meaningful vocabulary practice set for these words:\n{words}\n\n"
        "INSTRUCTIONS:\n"
        "1. Create a MIX of these types: Multiple Choice (meaning), Synonym Match, Contextual Fill-in (sentence), and Scrambled Sentences.\n"
        "2. Ensure questions are NATURAL and reflect real-world usage.\n"
        "3. Provide explanation in Vietnamese for each.\n"
        "4. CRITICAL: Each question MUST include the 'word_id' field matching the ID provided in the list above.\n\n"
        "Return a JSON array of 10-15 questions. Each object must have: {{word_id, question, hint_vn, options, answer, explanation_vn}}."
    )
    chain = prompt | llm
    
    full_content = ""
    async for chunk in _safe_astream(chain, {"words": words_info}, difficulty="medium"):
        full_content += chunk.content
        yield json.dumps({"status": "generating", "chunk": chunk.content}, ensure_ascii=False)
        
    try:
        result = parse_json_response(full_content)
        yield json.dumps(result, ensure_ascii=False)
    except:
        yield json.dumps({"error": "Failed to parse AI response"}, ensure_ascii=False)



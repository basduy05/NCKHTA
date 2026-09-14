import re
from typing import Dict, List, Any

def _normalize_text(text: str) -> str:
    """Normalize text by lowercasing and removing punctuation."""
    text = text.lower()
    text = re.sub(r"[^\w\s\']", "", text)
    return text.strip()

def _levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def evaluate_speech_transcript(transcript: str, expected_text: str) -> Dict[str, Any]:
    """
    Evaluate pronunciation by comparing spoken transcript with expected text.
    Returns:
    - score (0-100)
    - accuracy classification
    - word-by-word breakdown
    - specific feedback in Vietnamese
    """
    norm_expected = _normalize_text(expected_text)
    norm_spoken = _normalize_text(transcript)

    if not norm_expected:
        return {
            "score": 0,
            "transcript": transcript,
            "expected_text": expected_text,
            "feedback": "Vui lòng cung cấp câu mẫu để đối chiếu.",
            "word_analysis": []
        }

    if not norm_spoken:
        return {
            "score": 0,
            "transcript": transcript,
            "expected_text": expected_text,
            "feedback": "Không nhận diện được giọng nói. Vui lòng thử lại gần micro hơn.",
            "word_analysis": []
        }

    expected_words = norm_expected.split()
    spoken_words = norm_spoken.split()

    # Word-level comparison
    word_analysis = []
    correct_count = 0

    for i, exp_word in enumerate(expected_words):
        if i < len(spoken_words):
            spk_word = spoken_words[i]
            dist = _levenshtein_distance(exp_word, spk_word)
            max_len = max(len(exp_word), len(spk_word), 1)
            similarity = 1.0 - (dist / max_len)

            if similarity >= 0.85:
                status = "correct"
                correct_count += 1
            elif similarity >= 0.5:
                status = "near"
                correct_count += 0.5
            else:
                status = "incorrect"
            
            word_analysis.append({
                "word": exp_word,
                "spoken": spk_word,
                "status": status,
                "similarity": round(similarity * 100, 1)
            })
        else:
            word_analysis.append({
                "word": exp_word,
                "spoken": None,
                "status": "missing",
                "similarity": 0
            })

    total_words = len(expected_words)
    raw_score = int(round((correct_count / total_words) * 100))
    score = max(0, min(100, raw_score))

    # Construct contextual feedback
    near_or_incorrect = [w["word"] for w in word_analysis if w["status"] in ("near", "incorrect")]
    missing = [w["word"] for w in word_analysis if w["status"] == "missing"]

    feedback_parts = []
    if score >= 90:
        feedback_parts.append("Xuất sắc! Phát âm rất rõ ràng, chuẩn ngữ điệu tự nhiên.")
    elif score >= 75:
        feedback_parts.append("Tốt! Đa số từ vựng phát âm chuẩn xác.")
    elif score >= 50:
        feedback_parts.append("Khá! Cần lưu ý các âm đuôi và phát âm rõ từng âm tiết hơn.")
    else:
        feedback_parts.append("Cần luyện tập thêm để cải thiện độ chính xác từng từ.")

    if near_or_incorrect:
        feedback_parts.append(f"Chú ý các từ cần cải thiện: {', '.join(near_or_incorrect[:4])}.")
    if missing:
        feedback_parts.append(f"Bạn đã bỏ sót từ: {', '.join(missing[:3])}.")

    return {
        "score": score,
        "transcript": transcript,
        "expected_text": expected_text,
        "feedback": " ".join(feedback_parts),
        "word_analysis": word_analysis,
        "phoneme_notes": "Hãy chú ý nhấn trọng âm đúng vị trí và phát âm rõ ending sounds (-s, -ed, -t)."
    }


async def transcribe_audio_bytes(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """Transcribe audio bytes using Gemini multimodal audio or local whisper."""
    import os
    # 1. Try Gemini Audio Transcription
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        try:
            from ..database import get_setting
            api_key = get_setting("GOOGLE_API_KEY")
        except Exception:
            pass

    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            # Use gemini-2.5-flash or gemini-2.5-flash-lite
            model = genai.GenerativeModel("gemini-2.5-flash")
            prompt = "Transcribe the spoken English speech accurately word-for-word. Return only the transcribed English words."
            clean_mime = mime_type.split(";")[0].strip() if mime_type else "audio/webm"
            res = model.generate_content([
                {"mime_type": clean_mime, "data": audio_bytes},
                prompt
            ])
            if res and res.text:
                return res.text.strip()
        except Exception as e:
            print(f"[STT GEMINI] Error transcribing audio: {e}")

    # 2. Try Whisper local if installed
    try:
        import whisper
        import tempfile
        model = whisper.load_model("base")
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            res = model.transcribe(tmp_path)
            return res.get("text", "").strip()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except Exception as e:
        print(f"[STT WHISPER] Error transcribing: {e}")

    return ""


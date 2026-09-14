"""
LLM Service Facade
Provides unified interface and 100% backward compatibility with existing routers and scripts.
The underlying implementation is modularized cleanly under `app.services.llm`.
"""
# Re-export all submodules
from .llm.schemas import (
    FlashcardSchema,
    VocabItemSchema,
    VocabListSchema,
    QuizQuestionSchema,
    QuizListSchema,
    FSRSQuestionSchema,
    FSRSQuizListSchema,
)

from .llm.cache import (
    _dict_cache,
    _cache_lock,
    CACHE_TTL,
    CACHE_MAX_SIZE,
    _cache_get,
    _cache_set,
    is_data_complete,
)

from .llm.providers import (
    _get_optimal_concurrency,
    MAX_CONCURRENT_AI_REQUESTS,
    ai_semaphore,
    get_queue_status,
    truncate_context,
    _is_local_fast_mode,
    rerank_results,
    parse_json_response,
    _parse_json_strict,
    _is_valid_quiz_payload,
    _is_valid_ipa_payload,
    _is_valid_exercises_payload,
    get_llm,
    MAX_RETRIES,
    RETRY_DELAY,
    _safe_invoke,
    _safe_invoke_async,
    _safe_astream,
)

from .llm.dictionary import (
    generate_example_sentence,
    lookup_free_dictionary,
    lookup_wikipedia,
    translate_meanings_with_ai,
    translate_meanings_with_ai_stream,
    lookup_dictionary_full_ai,
    lookup_dictionary_full_ai_stream,
    lookup_dictionary,
    lookup_dictionary_stream,
    generate_flashcard_content,
    extract_vocabulary_from_text,
    generate_vocab_practice_rich,
    generate_vocab_practice_rich_stream,
)

from .llm.quiz import (
    generate_quiz_from_text,
    generate_fsrs_review_quiz,
    generate_exercises_from_text,
    generate_exercises_from_text_stream,
    generate_practice_test,
    generate_practice_test_stream,
    generate_grammar_rule_description,
    generate_grammar_practice,
    generate_grammar_practice_stream,
    generate_exam_content,
)

from .llm.reading import (
    generate_reading_passage,
    generate_reading_passage_stream,
    generate_reading_comprehension,
    generate_reading_comprehension_stream,
)

from .llm.ipa import (
    generate_ipa_lesson,
    generate_ipa_lesson_stream,
    generate_speaking_topic,
    generate_speaking_topic_stream,
)

from .llm.writing import (
    evaluate_writing,
    evaluate_writing_stream,
    grade_writing_assignment,
    generate_personalized_roadmap_stream,
    generate_personalized_roadmap,
)

# Also expose all attributes for dynamic access
__all__ = [
    # Schemas
    "FlashcardSchema",
    "VocabItemSchema",
    "VocabListSchema",
    "QuizQuestionSchema",
    "QuizListSchema",
    "FSRSQuestionSchema",
    "FSRSQuizListSchema",
    # Cache
    "_dict_cache",
    "_cache_lock",
    "CACHE_TTL",
    "CACHE_MAX_SIZE",
    "_cache_get",
    "_cache_set",
    "is_data_complete",
    # Providers & Execution
    "_get_optimal_concurrency",
    "MAX_CONCURRENT_AI_REQUESTS",
    "ai_semaphore",
    "get_queue_status",
    "truncate_context",
    "_is_local_fast_mode",
    "rerank_results",
    "parse_json_response",
    "_parse_json_strict",
    "_is_valid_quiz_payload",
    "_is_valid_ipa_payload",
    "_is_valid_exercises_payload",
    "get_llm",
    "MAX_RETRIES",
    "RETRY_DELAY",
    "_safe_invoke",
    "_safe_invoke_async",
    "_safe_astream",
    # Dictionary
    "generate_example_sentence",
    "lookup_free_dictionary",
    "lookup_wikipedia",
    "translate_meanings_with_ai",
    "translate_meanings_with_ai_stream",
    "lookup_dictionary_full_ai",
    "lookup_dictionary_full_ai_stream",
    "lookup_dictionary",
    "lookup_dictionary_stream",
    "generate_flashcard_content",
    "extract_vocabulary_from_text",
    "generate_vocab_practice_rich",
    "generate_vocab_practice_rich_stream",
    # Quiz & Practice
    "generate_quiz_from_text",
    "generate_fsrs_review_quiz",
    "generate_exercises_from_text",
    "generate_exercises_from_text_stream",
    "generate_practice_test",
    "generate_practice_test_stream",
    "generate_reading_passage",
    "generate_reading_passage_stream",
    "generate_grammar_rule_description",
    "generate_grammar_practice",
    "generate_grammar_practice_stream",
    "generate_exam_content",
    "generate_reading_comprehension",
    "generate_reading_comprehension_stream",
    # IPA
    "generate_ipa_lesson",
    "generate_ipa_lesson_stream",
    "generate_speaking_topic",
    "generate_speaking_topic_stream",
    # Writing & Roadmap
    "evaluate_writing",
    "evaluate_writing_stream",
    "grade_writing_assignment",
    "generate_personalized_roadmap_stream",
    "generate_personalized_roadmap",
]

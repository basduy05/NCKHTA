from pydantic import BaseModel, Field
from typing import List, Optional

class FlashcardSchema(BaseModel):
    word: str = Field(description="The word being defined")
    definition: str = Field(description="Clear English definition")
    example: str = Field(description="Example usage sentence")
    synonym: str = Field(description="A synonymous word")
    antonym: str = Field(description="An antonymous word")

class VocabItemSchema(BaseModel):
    word: str
    pos: str
    meaning_vn: str
    meaning_en: str
    example: str
    level: str
    phonetic: str

class VocabListSchema(BaseModel):
    items: List[VocabItemSchema]

class QuizQuestionSchema(BaseModel):
    type: str = Field(description="Must be MCQ, TFNG, MATCH, or FIB")
    question: str
    options: List[str]
    answer: str
    explanation: str

class QuizListSchema(BaseModel):
    items: List[QuizQuestionSchema]

class FSRSQuestionSchema(BaseModel):
    type: str = Field(description="Must be MCQ, FIB, SPELLING, or PARAPHRASE")
    question: str = Field(description="The main question text (English ONLY)")
    context: Optional[str] = Field(default=None, description="A context sentence with a [blank] for FIB or SPELLING")
    options: Optional[List[str]] = Field(default=None, description="Array of choices (for MCQ/PARAPHRASE)")
    answer: str = Field(description="The correct answer string (must match an option or be the exact spelling word)")
    hint_vn: Optional[str] = Field(default=None, description="A helpful Vietnamese hint or translation")
    explanation_en: Optional[str] = Field(default=None, description="Explanation of why the answer is correct (English ONLY)")
    word_id: Optional[int] = Field(default=None)

class FSRSQuizListSchema(BaseModel):
    items: List[FSRSQuestionSchema]
# ----------------------------------------------

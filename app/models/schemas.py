from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime


class BloomLevel(str, Enum):
    RBT1 = "RBT1"
    RBT2 = "RBT2"
    RBT3 = "RBT3"
    RBT4 = "RBT4"
    RBT5 = "RBT5"
    RBT6 = "RBT6"


class Difficulty(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


# Request Schemas
class QuestionGenerateRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255, description="Subject name")
    topic: str = Field(..., min_length=1, max_length=255, description="Topic name")
    bloom_level: BloomLevel = Field(..., description="Bloom's Taxonomy level (RBT1-RBT6)")
    difficulty: Difficulty = Field(..., description="Question difficulty")
    marks: int = Field(..., ge=1, le=100, description="Marks for the question")
    
    class Config:
        json_schema_extra = {
            "example": {
                "subject": "Data Structures",
                "topic": "Arrays",
                "bloom_level": "RBT2",
                "difficulty": "MEDIUM",
                "marks": 15
            }
        }


class BatchQuestionSpec(BaseModel):
    topic: str
    bloom_level: BloomLevel
    difficulty: Difficulty
    marks: int


class BatchPlanRequest(BaseModel):
    plan_name: str = Field(..., min_length=1, max_length=255)
    subject: str = Field(..., min_length=1, max_length=255)
    questions: List[BatchQuestionSpec] = Field(..., min_items=1)
    
    class Config:
        json_schema_extra = {
            "example": {
                "plan_name": "Midterm Exam",
                "subject": "Data Structures",
                "questions": [
                    {"topic": "Arrays", "bloom_level": "RBT1", "difficulty": "EASY", "marks": 15},
                    {"topic": "Linked Lists", "bloom_level": "RBT2", "difficulty": "MEDIUM", "marks": 15}
                ]
            }
        }


# Response Schemas
class QuestionMetadata(BaseModel):
    subject: str
    topic: str
    bloom_level: BloomLevel
    difficulty: Difficulty
    marks: int


class QuestionResponse(BaseModel):
    id: int
    question_text: str
    metadata: QuestionMetadata
    created_at: datetime
    
    class Config:
        from_attributes = True


class BatchPlanResponse(BaseModel):
    id: int
    plan_name: str
    total_questions: int
    questions: List[QuestionResponse]
    created_at: datetime
    
    class Config:
        from_attributes = True


class QuestionListResponse(BaseModel):
    questions: List[QuestionResponse]
    total: int

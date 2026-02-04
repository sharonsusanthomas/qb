from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas import (
    QuestionGenerateRequest,
    QuestionResponse,
    QuestionListResponse
)
from app.services.question_generator import QuestionGeneratorService

router = APIRouter(prefix="/api/v1/questions", tags=["Questions"])


@router.post("/generate", response_model=QuestionResponse, status_code=201)
def generate_question(
    request: QuestionGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a single academic question based on provided metadata
    
    - **subject**: Subject name (e.g., "Data Structures")
    - **topic**: Topic name (e.g., "Arrays")
    - **bloom_level**: Bloom's Taxonomy level (RBT1-RBT6)
    - **difficulty**: Question difficulty (Easy, Medium, Hard)
    - **marks**: Marks for the question (1-100)
    """
    service = QuestionGeneratorService(db)
    return service.generate_question(request)


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: int,
    db: Session = Depends(get_db)
):
    """Get a question by ID"""
    service = QuestionGeneratorService(db)
    question = service.get_question_by_id(question_id)
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return question


@router.get("/", response_model=QuestionListResponse)
def list_questions(
    subject: str | None = None,
    topic: str | None = None,
    bloom_level: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    List questions with optional filters
    
    - **subject**: Filter by subject (optional)
    - **topic**: Filter by topic (optional)
    - **bloom_level**: Filter by Bloom's level (optional)
    - **limit**: Maximum number of questions to return (default: 50)
    """
    service = QuestionGeneratorService(db)
    questions = service.list_questions(
        subject=subject,
        topic=topic,
        bloom_level=bloom_level,
        limit=limit
    )
    
    return QuestionListResponse(
        questions=questions,
        total=len(questions)
    )

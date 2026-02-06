from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas import (
    QuestionGenerateRequest,
    QuestionManualRequest,
    QuestionResponse,
    QuestionListResponse
)
from app.services.question_generator import QuestionGeneratorService
from app.models.database import Question, QuestionStatus # Add Question and Status to use manually

router = APIRouter(prefix="/api/v1/questions", tags=["Questions"])


@router.post("/manual", response_model=QuestionResponse, status_code=201)
def add_manual_question(
    request: QuestionManualRequest,
    db: Session = Depends(get_db)
):
    """Manually add a question to the bank (bypass AI generation)"""
    new_question = Question(
        question_text=request.question_text,
        subject=request.subject,
        topic=request.topic,
        bloom_level=request.bloom_level,
        difficulty=request.difficulty,
        marks=request.marks,
        status=QuestionStatus.DEDUPE_PENDING
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    
    # We return the response format expected by frontend
    from app.models.schemas import QuestionMetadata
    return QuestionResponse(
        id=new_question.id,
        question_text=new_question.question_text,
        status=new_question.status,
        metadata=QuestionMetadata(
            subject=new_question.subject,
            topic=new_question.topic,
            bloom_level=new_question.bloom_level,
            difficulty=new_question.difficulty,
            marks=new_question.marks
        ),
        created_at=new_question.created_at
    )


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

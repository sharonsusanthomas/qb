from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.database import Question, QuestionStatus
from app.models.schemas import QuestionResponse, QuestionMetadata
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


class StatusCountResponse(BaseModel):
    dedupe_pending: int
    dedupe_approved: int
    approved: int


class UpdateStatusRequest(BaseModel):
    question_ids: List[int]
    new_status: QuestionStatus


@router.get("/stats", response_model=StatusCountResponse)
def get_status_counts(db: Session = Depends(get_db)):
    """Get count of questions by status"""
    dedupe_pending = db.query(Question).filter(Question.status == QuestionStatus.DEDUPE_PENDING).count()
    dedupe_approved = db.query(Question).filter(Question.status == QuestionStatus.DEDUPE_APPROVED).count()
    approved = db.query(Question).filter(Question.status == QuestionStatus.APPROVED).count()
    
    return StatusCountResponse(
        dedupe_pending=dedupe_pending,
        dedupe_approved=dedupe_approved,
        approved=approved
    )


@router.get("/questions/{status}", response_model=List[QuestionResponse])
def get_questions_by_status(status: QuestionStatus, db: Session = Depends(get_db)):
    """Get all questions with a specific status"""
    questions = db.query(Question).filter(Question.status == status).order_by(Question.created_at.desc()).all()
    
    return [
        QuestionResponse(
            id=q.id,
            question_text=q.question_text,
            status=q.status,
            metadata=QuestionMetadata(
                subject=q.subject,
                topic=q.topic,
                bloom_level=q.bloom_level,
                difficulty=q.difficulty,
                marks=q.marks
            ),
            created_at=q.created_at
        )
        for q in questions
    ]


@router.post("/submit-for-dedupe")
def submit_for_deduplication(request: UpdateStatusRequest, db: Session = Depends(get_db)):
    """Submit questions for deduplication check (moves to DEDUPE_APPROVED)"""
    questions = db.query(Question).filter(Question.id.in_(request.question_ids)).all()
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found")
    
    for question in questions:
        question.status = QuestionStatus.DEDUPE_APPROVED
    
    db.commit()
    
    return {"message": f"Successfully submitted {len(questions)} questions for deduplication", "count": len(questions)}


@router.post("/approve")
def approve_questions(request: UpdateStatusRequest, db: Session = Depends(get_db)):
    """Approve questions (moves to APPROVED)"""
    questions = db.query(Question).filter(Question.id.in_(request.question_ids)).all()
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found")
    
    for question in questions:
        question.status = QuestionStatus.APPROVED
    
    db.commit()
    
    return {"message": f"Successfully approved {len(questions)} questions", "count": len(questions)}

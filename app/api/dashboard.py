from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal
from app.models.database import Question, QuestionStatus, DuplicateMatch
from app.models.schemas import QuestionResponse, QuestionMetadata, DuplicateMatchResponse
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


class StatusCountResponse(BaseModel):
    dedupe_pending: int
    dedupe_approved: int
    duplicate_flagged: int
    approved: int


class UpdateStatusRequest(BaseModel):
    question_ids: List[int]
    new_status: QuestionStatus


def run_bg_dedupe(question_ids: List[int]):
    """Background task to run deduplication logic"""
    from app.services.logger_service import log
    log.info(f"Background Process Started for {len(question_ids)} questions.")
    db = SessionLocal()
    try:
        from app.services.deduplicator import DeduplicationService
        deduper = DeduplicationService(db)
        questions = db.query(Question).filter(Question.id.in_(question_ids)).all()
        for question in questions:
            deduper.check_question(question)
        log.success(f"Background Deduplication completed for batch of {len(question_ids)}.")
    except Exception as e:
        log.error(f"Background dedupe failed: {e}")
    finally:
        db.close()


@router.get("/stats", response_model=StatusCountResponse)
def get_status_counts(db: Session = Depends(get_db)):
    """Get count of questions by status"""
    dedupe_pending = db.query(Question).filter(Question.status == QuestionStatus.DEDUPE_PENDING).count()
    dedupe_approved = db.query(Question).filter(Question.status == QuestionStatus.DEDUPE_APPROVED).count()
    duplicate_flagged = db.query(Question).filter(Question.status == QuestionStatus.DUPLICATE_FLAGGED).count()
    approved = db.query(Question).filter(Question.status == QuestionStatus.APPROVED).count()
    
    return {
        "dedupe_pending": dedupe_pending,
        "dedupe_approved": dedupe_approved,
        "duplicate_flagged": duplicate_flagged,
        "approved": approved
    }


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


@router.get("/duplicates/{question_id}", response_model=List[DuplicateMatchResponse])
def get_duplicate_matches(question_id: int, db: Session = Depends(get_db)):
    """Get all duplicates flagged for a specific question"""
    matches = db.query(DuplicateMatch).filter(DuplicateMatch.question_id == question_id).all()
    
    results = []
    for m in matches:
        q = m.match_question
        results.append(DuplicateMatchResponse(
            id=m.id,
            similarity_score=m.similarity_score,
            verdict=m.verdict,
            reason=m.reason,
            match_question=QuestionResponse(
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
        ))
    return results


@router.post("/submit-for-dedupe")
def submit_for_deduplication(
    request: UpdateStatusRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Moves questions to DEDUPE_APPROVED (temporary) then runs background check to flip to FLAGGED if needed"""
    questions = db.query(Question).filter(Question.id.in_(request.question_ids)).all()
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found")
    
    # Immediately move them to Dedupe Approved (the "waiting room")
    for q in questions:
        q.status = QuestionStatus.DEDUPE_APPROVED
    
    db.commit()
    
    # Start the actual ML processing in the background
    background_tasks.add_task(run_bg_dedupe, request.question_ids)
    
    return {
        "message": f"Submitted {len(questions)} questions for background deduplication check.",
        "count": len(questions)
    }


@router.post("/update-status")
def update_question_status(request: UpdateStatusRequest, db: Session = Depends(get_db)):
    """Generic endpoint to update question status (Approve or Flag)"""
    from app.services.logger_service import log
    questions = db.query(Question).filter(Question.id.in_(request.question_ids)).all()
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found")
    
    for question in questions:
        log.process(f"Updating Question #{question.id} status: {question.status} -> {request.new_status}")
        question.status = request.new_status
    
    db.commit()
    log.success(f"Batch update successful. {len(questions)} questions updated.")
    
    return {"message": f"Successfully updated {len(questions)} questions to {request.new_status}", "count": len(questions)}


@router.post("/approve")
def approve_questions(request: UpdateStatusRequest, db: Session = Depends(get_db)):
    """Approve questions (moves to APPROVED)"""
    return update_question_status(request, db)

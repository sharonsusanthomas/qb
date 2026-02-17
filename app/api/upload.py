from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.schemas import (
    QuestionResponse, 
    QuestionGenerateRequest,
    BloomLevel,
    Difficulty
)
from app.services.question_generator import QuestionGeneratorService
from app.services.pdf_service import PDFService
import json

router = APIRouter(prefix="/api/v1/generate-from-notes", tags=["Context Generation"])


@router.post("/", response_model=list[QuestionResponse])
@limiter.limit("3/minute")
async def generate_from_notes(
    request: Request,
    file: UploadFile = File(...),
    subject: str = Form(...),
    topic: str = Form(...),
    bloom_level: str = Form(...),
    difficulty: str = Form(...),
    marks: int = Form(...),
    count: int = Form(default=1),
    course_outcome_ids: list[int] = Form(default=[]),
    custom_prompt: str = Form(default=""),
    db: Session = Depends(get_db)
):
    """
    Generate one or more questions from an uploaded PDF file
    """
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Read and extract text
    try:
        content = await file.read()
        extracted_text = PDFService.extract_text(content)
        
        if not extracted_text:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    
    # Create request object
    try:
        request_data = QuestionGenerateRequest(
            subject=subject,
            topic=topic,
            bloom_level=BloomLevel(bloom_level),
            difficulty=Difficulty(difficulty),
            marks=marks,
            count=count,
            course_outcome_ids=course_outcome_ids
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameters: {str(e)}")
    
    # Generate question
    service = QuestionGeneratorService(db)
    return service.generate_questions_from_context(
        context=extracted_text,
        request=request_data,
        custom_prompt=custom_prompt
    )

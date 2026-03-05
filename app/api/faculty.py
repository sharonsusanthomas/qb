from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from app.core.database import get_db
from app.services.style_analyzer import StyleAnalyzerService
from app.models.database import FacultyPersona, GoldenQuestion, FeedbackLog
from app.models.schemas import (
    FacultyPersonaCreate,
    FacultyPersonaResponse,
    GoldenQuestionCreate,
    GoldenQuestionResponse,
    FeedbackLogCreate,
    FeedbackLogResponse
)

router = APIRouter(prefix="/api/v1/faculty", tags=["Faculty Personas"])

@router.post("/personas", response_model=FacultyPersonaResponse, status_code=201)
def create_persona(
    request: FacultyPersonaCreate,
    db: Session = Depends(get_db)
):
    """Create a new Faculty Persona profile"""
    existing = db.query(FacultyPersona).filter(FacultyPersona.faculty_name == request.faculty_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Persona with this name already exists")
        
    new_persona = FacultyPersona(
        faculty_name=request.faculty_name,
        style_weights=request.style_weights,
        linguistic_thumbprint=request.linguistic_thumbprint,
        scenario_grounding=request.scenario_grounding
    )
    db.add(new_persona)
    db.commit()
    db.refresh(new_persona)
    return new_persona

@router.get("/personas", response_model=list[FacultyPersonaResponse])
def list_personas(db: Session = Depends(get_db)):
    """List all Faculty Personas"""
    return db.query(FacultyPersona).options(
        selectinload(FacultyPersona.golden_questions),
        selectinload(FacultyPersona.feedback_logs)
    ).all()

@router.post("/personas/{persona_id}/examples", response_model=GoldenQuestionResponse, status_code=201)
def add_golden_question(
    persona_id: int,
    request: GoldenQuestionCreate,
    db: Session = Depends(get_db)
):
    """Add a 'Golden Question' example to a Faculty Persona"""
    persona = db.query(FacultyPersona).filter(FacultyPersona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
        
    new_example = GoldenQuestion(
        faculty_persona_id=persona_id,
        question_text=request.question_text,
        subject=request.subject
    )
    db.add(new_example)
    db.commit()
    db.refresh(new_example)
    return new_example

@router.post("/personas/{persona_id}/feedback", response_model=FeedbackLogResponse, status_code=201)
def add_feedback_log(
    persona_id: int,
    request: FeedbackLogCreate,
    db: Session = Depends(get_db)
):
    """Log feedback/correction for a Faculty Persona to avoid future mistakes"""
    persona = db.query(FacultyPersona).filter(FacultyPersona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
        
    new_feedback = FeedbackLog(
        faculty_persona_id=persona_id,
        original_text=request.original_text,
        corrected_text=request.corrected_text,
        critique=request.critique
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    return new_feedback

@router.post("/personas/{persona_id}/analyze", status_code=200)
def analyze_persona_style(
    persona_id: int,
    db: Session = Depends(get_db)
):
    """Trigger the Style Analyzer to extract stylistic weights and linguistic thumbprint from Golden Questions."""
    analyzer = StyleAnalyzerService(db)
    
    try:
        result = analyzer.analyze_persona(persona_id)
        if result.get("status") == "error":
            raise HTTPException(status_code=400, detail=result.get("message"))
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.schemas import BatchPlanRequest, BatchPlanResponse
from app.services.batch_service import BatchService

router = APIRouter(prefix="/api/v1/batch", tags=["Batch"])


@router.post("/plan", response_model=BatchPlanResponse, status_code=201)
@limiter.limit("1/minute")
def create_batch_plan(
    request: Request,
    batch_request: BatchPlanRequest,
    db: Session = Depends(get_db)
):
    """
    Create a batch plan and generate multiple questions
    
    Each question is generated independently using the canonical prompt.
    
    - **plan_name**: Name for this batch plan
    - **subject**: Subject for all questions
    - **questions**: List of question specifications (topic, bloom_level, difficulty, marks)
    """
    service = BatchService(db)
    return service.create_batch_plan(batch_request)


@router.get("/plan/{batch_id}", response_model=BatchPlanResponse)
def get_batch_plan(
    batch_id: int,
    db: Session = Depends(get_db)
):
    """Get a batch plan by ID with all generated questions"""
    service = BatchService(db)
    batch_plan = service.get_batch_plan(batch_id)
    
    if not batch_plan:
        raise HTTPException(status_code=404, detail="Batch plan not found")
    
    return batch_plan

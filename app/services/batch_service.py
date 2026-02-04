from sqlalchemy.orm import Session
from app.models.database import BatchPlan, BatchQuestion
from app.models.schemas import BatchPlanRequest, BatchPlanResponse, QuestionGenerateRequest
from app.services.question_generator import QuestionGeneratorService


class BatchService:
    """Service for batch question generation"""
    
    def __init__(self, db: Session):
        self.db = db
        self.question_service = QuestionGeneratorService(db)
    
    def create_batch_plan(self, request: BatchPlanRequest) -> BatchPlanResponse:
        """
        Create a batch plan and generate all questions
        
        Args:
            request: Batch plan request with question specifications
            
        Returns:
            BatchPlanResponse with all generated questions
        """
        # Create batch plan
        batch_plan = BatchPlan(
            plan_name=request.plan_name,
            total_questions=len(request.questions)
        )
        
        self.db.add(batch_plan)
        self.db.commit()
        self.db.refresh(batch_plan)
        
        # Generate questions one by one
        generated_questions = []
        
        for idx, question_spec in enumerate(request.questions, start=1):
            # Create question request
            question_request = QuestionGenerateRequest(
                subject=request.subject,
                topic=question_spec.topic,
                bloom_level=question_spec.bloom_level,
                difficulty=question_spec.difficulty,
                marks=question_spec.marks
            )
            
            # Generate question
            question_response = self.question_service.generate_question(question_request)
            
            # Link to batch
            batch_question = BatchQuestion(
                batch_plan_id=batch_plan.id,
                question_id=question_response.id,
                sequence_number=idx
            )
            
            self.db.add(batch_question)
            generated_questions.append(question_response)
        
        self.db.commit()
        
        # Build response
        return BatchPlanResponse(
            id=batch_plan.id,
            plan_name=batch_plan.plan_name,
            total_questions=batch_plan.total_questions,
            questions=generated_questions,
            created_at=batch_plan.created_at
        )
    
    def get_batch_plan(self, batch_id: int) -> BatchPlanResponse | None:
        """Get a batch plan by ID with all questions"""
        batch_plan = self.db.query(BatchPlan).filter(BatchPlan.id == batch_id).first()
        
        if not batch_plan:
            return None
        
        # Get all questions in order
        batch_questions = (
            self.db.query(BatchQuestion)
            .filter(BatchQuestion.batch_plan_id == batch_id)
            .order_by(BatchQuestion.sequence_number)
            .all()
        )
        
        questions = [
            self.question_service.get_question_by_id(bq.question_id)
            for bq in batch_questions
        ]
        
        return BatchPlanResponse(
            id=batch_plan.id,
            plan_name=batch_plan.plan_name,
            total_questions=batch_plan.total_questions,
            questions=[q for q in questions if q is not None],
            created_at=batch_plan.created_at
        )

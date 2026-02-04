from sqlalchemy.orm import Session
from app.models.database import Question
from app.models.schemas import (
    QuestionGenerateRequest,
    QuestionResponse,
    QuestionMetadata
)
from app.services.prompt_builder import PromptBuilder
from app.services.llm_client import llm_client
from app.services.validator import QuestionValidator


class QuestionGeneratorService:
    """Service for generating academic questions"""
    
    def __init__(self, db: Session):
        self.db = db
        self.prompt_builder = PromptBuilder()
        self.validator = QuestionValidator()
    
    def generate_question(self, request: QuestionGenerateRequest) -> QuestionResponse:
        """
        Generate a single question based on the request parameters
        
        Args:
            request: Question generation request with metadata
            
        Returns:
            QuestionResponse with generated question and metadata
        """
        # Build canonical prompt
        prompt = self.prompt_builder.build_question_prompt(
            subject=request.subject,
            topic=request.topic,
            bloom_level=request.bloom_level,
            difficulty=request.difficulty,
            marks=request.marks
        )
        
        # Generate question using LLM
        question_text = llm_client.generate(prompt)
        
        # Validate question
        is_valid, validation_message = self.validator.validate_question(
            question_text=question_text,
            bloom_level=request.bloom_level,
            marks=request.marks
        )
        
        if not is_valid:
            # Regenerate if validation fails
            question_text = llm_client.generate(prompt)
        
        # Save to database
        db_question = Question(
            subject=request.subject,
            topic=request.topic,
            bloom_level=request.bloom_level,
            difficulty=request.difficulty,
            marks=request.marks,
            question_text=question_text
        )
        
        self.db.add(db_question)
        self.db.commit()
        self.db.refresh(db_question)
        
        # Build response
        return QuestionResponse(
            id=db_question.id,
            question_text=db_question.question_text,
            metadata=QuestionMetadata(
                subject=db_question.subject,
                topic=db_question.topic,
                bloom_level=db_question.bloom_level,
                difficulty=db_question.difficulty,
                marks=db_question.marks
            ),
            created_at=db_question.created_at
        )
    
    def get_question_by_id(self, question_id: int) -> QuestionResponse | None:
        """Get a question by ID"""
        question = self.db.query(Question).filter(Question.id == question_id).first()
        
        if not question:
            return None
        
        return QuestionResponse(
            id=question.id,
            question_text=question.question_text,
            metadata=QuestionMetadata(
                subject=question.subject,
                topic=question.topic,
                bloom_level=question.bloom_level,
                difficulty=question.difficulty,
                marks=question.marks
            ),
            created_at=question.created_at
        )
    
    def list_questions(
        self,
        subject: str | None = None,
        topic: str | None = None,
        bloom_level: str | None = None,
        limit: int = 50
    ) -> list[QuestionResponse]:
        """List questions with optional filters"""
        query = self.db.query(Question)
        
        if subject:
            query = query.filter(Question.subject == subject)
        if topic:
            query = query.filter(Question.topic == topic)
        if bloom_level:
            query = query.filter(Question.bloom_level == bloom_level)
        
        questions = query.order_by(Question.created_at.desc()).limit(limit).all()
        
        return [
            QuestionResponse(
                id=q.id,
                question_text=q.question_text,
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

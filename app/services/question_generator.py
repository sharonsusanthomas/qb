import logging
from sqlalchemy.orm import Session
from app.models.database import Question
from app.models.subject_topic import CourseOutcome
from app.models.schemas import (
    QuestionGenerateRequest,
    QuestionResponse,
    QuestionMetadata
)
from app.services.prompt_builder import PromptBuilder
from app.services.llm_client import llm_client
from app.services.validator import QuestionValidator

logger = logging.getLogger(__name__)


class QuestionGeneratorService:
    """Service for generating academic questions"""
    
    def __init__(self, db: Session):
        self.db = db
        self.prompt_builder = PromptBuilder()
        self.validator = QuestionValidator()
    
    def generate_questions(self, request: QuestionGenerateRequest) -> list[QuestionResponse]:
        """
        Generate multiple questions based on the request parameters
        """
        count = getattr(request, 'count', 1)
        logger.info(f"Starting batch generation of {count} questions for subject: {request.subject}, topic: {request.topic}")
        
        responses = []
        for i in range(count):
            logger.info(f"Generating question {i+1}/{count}...")
            
            # Build canonical prompt
            prompt = self.prompt_builder.build_question_prompt(
                subject=request.subject,
                topic=request.topic,
                bloom_level=request.bloom_level,
                difficulty=request.difficulty,
                marks=request.marks
            )
            
            # If generating multiple, add a hint for variety
            if count > 1:
                prompt += f"\n\nNote: This is question {i+1} of {count}. Please ensure it is unique and covers a different aspect of the topic than previous questions."
            
            # Handle Course Outcomes
            selected_cos = []
            if request.course_outcome_ids:
                selected_cos = self.db.query(CourseOutcome).filter(CourseOutcome.id.in_(request.course_outcome_ids)).all()
                if selected_cos:
                    co_text = "\n".join([f"- {co.outcome_code}: {co.description}" for co in selected_cos])
                    prompt += f"\n\nTarget Course Outcomes:\n{co_text}"
            
            logger.debug(f"Prompt sent to LLM for question {i+1}: {prompt[:200]}...")
            
            # Generate question using LLM
            question_text = llm_client.generate(prompt)
            logger.info(f"LLM generated content for question {i+1}")
            
            # Validate question
            is_valid, validation_message = self.validator.validate_question(
                question_text=question_text,
                bloom_level=request.bloom_level,
                marks=request.marks
            )
            
            if not is_valid:
                logger.warning(f"Validation failed for question {i+1}: {validation_message}. Retrying...")
                question_text = llm_client.generate(prompt + "\n\nIMPORTANT: Previous attempt failed validation. Please ensure strict adherence to Bloom's Taxonomy and marks constraints.")
            
            # Save to database
            db_question = Question(
                subject=request.subject,
                topic=request.topic,
                bloom_level=request.bloom_level,
                difficulty=request.difficulty,
                marks=request.marks,
                question_text=question_text
            )
            
            if selected_cos:
                db_question.course_outcomes = selected_cos
            
            self.db.add(db_question)
            self.db.commit()
            self.db.refresh(db_question)
            logger.info(f"Saved question {i+1} to database with ID: {db_question.id}")
            
            responses.append(QuestionResponse(
                id=db_question.id,
                question_text=db_question.question_text,
                status=db_question.status,
                metadata=QuestionMetadata(
                    subject=db_question.subject,
                    topic=db_question.topic,
                    bloom_level=db_question.bloom_level,
                    difficulty=db_question.difficulty,
                    marks=db_question.marks
                ),
                course_outcomes=db_question.course_outcomes,
                created_at=db_question.created_at
            ))
            
        return responses

    def generate_questions_from_context(
        self, 
        context: str,
        request: QuestionGenerateRequest,
        custom_prompt: str = ""
    ) -> list[QuestionResponse]:
        """
        Generate multiple questions based on provided context text
        """
        count = getattr(request, 'count', 1)
        logger.info(f"Starting batch context generation of {count} questions for subject: {request.subject}")
        
        responses = []
        for i in range(count):
            logger.info(f"Generating context question {i+1}/{count}...")
            
            # Build prompt with context
            prompt = self.prompt_builder.build_context_question_prompt(
                context=context,
                subject=request.subject,
                topic=request.topic,
                bloom_level=request.bloom_level,
                difficulty=request.difficulty,
                marks=request.marks,
                custom_prompt=custom_prompt
            )
            
            if count > 1:
                prompt += f"\n\nNote: This is question {i+1} of {count}. Please focus on a unique section of the context."
            
            # Handle Course Outcomes
            selected_cos = []
            if request.course_outcome_ids:
                selected_cos = self.db.query(CourseOutcome).filter(CourseOutcome.id.in_(request.course_outcome_ids)).all()
                if selected_cos:
                    co_text = "\n".join([f"- {co.outcome_code}: {co.description}" for co in selected_cos])
                    prompt += f"\n\nTarget Course Outcomes:\n{co_text}"
            
            logger.debug(f"Context prompt sent for question {i+1}")
            
            # Generate question using LLM
            question_text = llm_client.generate(prompt)
            
            # Validate question
            is_valid, validation_message = self.validator.validate_question(
                question_text=question_text,
                bloom_level=request.bloom_level,
                marks=request.marks
            )
            
            if not is_valid:
                logger.warning(f"Context validation failed for question {i+1}. Retrying...")
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
            
            if selected_cos:
                db_question.course_outcomes = selected_cos
                
            self.db.add(db_question)
            self.db.commit()
            self.db.refresh(db_question)
            logger.info(f"Saved context question {i+1} with ID: {db_question.id}")
            
            responses.append(QuestionResponse(
                id=db_question.id,
                question_text=db_question.question_text,
                status=db_question.status,
                metadata=QuestionMetadata(
                    subject=db_question.subject,
                    topic=db_question.topic,
                    bloom_level=db_question.bloom_level,
                    difficulty=db_question.difficulty,
                    marks=db_question.marks
                ),
                course_outcomes=db_question.course_outcomes,
                created_at=db_question.created_at
            ))
            
        return responses
    
    def get_question_by_id(self, question_id: int) -> QuestionResponse | None:
        """Get a question by ID"""
        question = self.db.query(Question).filter(Question.id == question_id).first()
        
        if not question:
            return None
        
        return QuestionResponse(
            id=question.id,
            question_text=question.question_text,
            status=question.status,
            metadata=QuestionMetadata(
                subject=question.subject,
                topic=question.topic,
                bloom_level=question.bloom_level,
                difficulty=question.difficulty,
                marks=question.marks
            ),
            course_outcomes=question.course_outcomes,
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
                status=q.status,
                metadata=QuestionMetadata(
                    subject=q.subject,
                    topic=q.topic,
                    bloom_level=q.bloom_level,
                    difficulty=q.difficulty,
                    marks=q.marks
                ),
                course_outcomes=q.course_outcomes,
                created_at=q.created_at
            )
            for q in questions
        ]

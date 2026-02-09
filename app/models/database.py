from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, TIMESTAMP, Float, Table
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class BloomLevel(str, enum.Enum):
    RBT1 = "RBT1"
    RBT2 = "RBT2"
    RBT3 = "RBT3"
    RBT4 = "RBT4"
    RBT5 = "RBT5"
    RBT6 = "RBT6"


class Difficulty(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class QuestionStatus(str, enum.Enum):
    DEDUPE_PENDING = "DEDUPE_PENDING"
    DEDUPE_APPROVED = "DEDUPE_APPROVED"
    DUPLICATE_FLAGGED = "DUPLICATE_FLAGGED"
    APPROVED = "APPROVED"


# Association table must be defined before Question
question_course_outcomes = Table(
    "question_course_outcomes",
    Base.metadata,
    Column("question_id", Integer, ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True),
    Column("course_outcome_id", Integer, ForeignKey("course_outcomes.id", ondelete="CASCADE"), primary_key=True),
)


class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject = Column(String(255), nullable=False, index=True)
    topic = Column(String(255), nullable=False, index=True)
    bloom_level = Column(Enum(BloomLevel), nullable=False, index=True)
    difficulty = Column(Enum(Difficulty), nullable=False, index=True)
    marks = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    status = Column(Enum(QuestionStatus), nullable=False, default=QuestionStatus.DEDUPE_PENDING, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    batch_questions = relationship("BatchQuestion", back_populates="question")
    duplicate_results = relationship("DuplicateMatch", foreign_keys="DuplicateMatch.question_id", back_populates="question")
    course_outcomes = relationship("CourseOutcome", secondary=question_course_outcomes, backref="questions")


class DuplicateMatch(Base):
    __tablename__ = "duplicate_matches"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    match_question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    similarity_score = Column(Float)  # Similarity score between 0 and 1
    verdict = Column(String(50))  # DUPLICATE, CONFLICT, UNIQUE
    reason = Column(Text)
    
    # Relationships
    question = relationship("Question", foreign_keys=[question_id], back_populates="duplicate_results")
    match_question = relationship("Question", foreign_keys=[match_question_id])


class BatchPlan(Base):
    __tablename__ = "batch_plans"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plan_name = Column(String(255))
    total_questions = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationship
    batch_questions = relationship("BatchQuestion", back_populates="batch_plan")


class BatchQuestion(Base):
    __tablename__ = "batch_questions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_plan_id = Column(Integer, ForeignKey("batch_plans.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    sequence_number = Column(Integer)
    
    # Relationships
    batch_plan = relationship("BatchPlan", back_populates="batch_questions")
    question = relationship("Question", back_populates="batch_questions")

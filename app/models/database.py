from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, TIMESTAMP
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


class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject = Column(String(255), nullable=False, index=True)
    topic = Column(String(255), nullable=False, index=True)
    bloom_level = Column(Enum(BloomLevel), nullable=False, index=True)
    difficulty = Column(Enum(Difficulty), nullable=False, index=True)
    marks = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationship
    batch_questions = relationship("BatchQuestion", back_populates="question")


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

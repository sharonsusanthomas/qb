from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_code = Column(String(20), nullable=False, unique=True, index=True)
    subject_name = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationship
    topics = relationship("Topic", back_populates="subject")
    course_outcomes = relationship("CourseOutcome", back_populates="subject")


class Topic(Base):
    __tablename__ = "topics"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    topic_name = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationship
    subject = relationship("Subject", back_populates="topics")


class CourseOutcome(Base):
    __tablename__ = "course_outcomes"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    outcome_code = Column(String(50), nullable=False)  # e.g., CO1, CO2
    description = Column(String(500), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationship
    subject = relationship("Subject", back_populates="course_outcomes")

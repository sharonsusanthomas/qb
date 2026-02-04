from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.subject_topic import Subject, Topic
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/v1/metadata", tags=["Metadata"])


class SubjectResponse(BaseModel):
    id: int
    course_code: str
    subject_name: str
    
    class Config:
        from_attributes = True


class TopicResponse(BaseModel):
    id: int
    topic_name: str
    
    class Config:
        from_attributes = True


@router.get("/subjects", response_model=List[SubjectResponse])
def get_subjects(db: Session = Depends(get_db)):
    """Get all subjects"""
    subjects = db.query(Subject).order_by(Subject.course_code).all()
    return subjects


@router.get("/subjects/{subject_id}/topics", response_model=List[TopicResponse])
def get_topics_by_subject(subject_id: int, db: Session = Depends(get_db)):
    """Get all topics for a specific subject"""
    topics = db.query(Topic).filter(Topic.subject_id == subject_id).order_by(Topic.topic_name).all()
    return topics

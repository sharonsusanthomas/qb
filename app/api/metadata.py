from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.subject_topic import Subject, Topic, CourseOutcome
from app.models.schemas import SubjectResponse, TopicResponse, CourseOutcomeResponse
from typing import List

router = APIRouter(prefix="/api/v1/metadata", tags=["Metadata"])


# Removed duplicate models as they are now in schemas.py


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


@router.get("/subjects/{subject_id}/course_outcomes", response_model=List[CourseOutcomeResponse])
def get_course_outcomes_by_subject(subject_id: int, db: Session = Depends(get_db)):
    """Get all course outcomes for a specific subject"""
    outcomes = db.query(CourseOutcome).filter(CourseOutcome.subject_id == subject_id).all()
    return outcomes

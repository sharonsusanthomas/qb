import sys
import os

# Add current directory to python path
sys.path.append(os.getcwd())

from app.core.database import Base, engine
from app.models.database import Question, question_course_outcomes
from app.models.subject_topic import CourseOutcome, Subject

def update_schema():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")
    
    # Also verify if they exist
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Existing tables: {tables}")
    
    if "course_outcomes" in tables and "question_course_outcomes" in tables:
        print("Schema update successful: course_outcomes and question_course_outcomes tables exist.")
    else:
        print("Schema update failed: Tables not found.")

if __name__ == "__main__":
    update_schema()

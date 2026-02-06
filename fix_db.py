from app.core.database import engine
from sqlalchemy import text

def reset_questions_table():
    with engine.connect() as connection:
        # Drop everything to ensure we get the clean new schema
        print("Dropping all existing tables...")
        from app.models.database import Base
        from app.models.subject_topic import Subject, Topic
        # We need to drop in order or just use Base.metadata.drop_all
        Base.metadata.drop_all(bind=engine)
        
        print("Creating all tables with new schema...")
        Base.metadata.create_all(bind=engine)
        
        print("Inserting seed data...")
        from sqlalchemy.orm import Session
        from app.models.subject_topic import Subject, Topic
        
        db = Session(bind=engine)
        try:
            # Add subjects
            subjects_data = [
                Subject(course_code='CS101', subject_name='Data Structures'),
                Subject(course_code='CS102', subject_name='Algorithms'),
                Subject(course_code='CS201', subject_name='DBMS'),
                Subject(course_code='CS202', subject_name='Operating Systems'),
                Subject(course_code='CS301', subject_name='Computer Networks'),
                Subject(course_code='CS302', subject_name='Software Engineering')
            ]
            db.add_all(subjects_data)
            db.commit()
            
            # Add topics (manual mapping to IDs after commit)
            topics_map = {
                'CS101': ['Arrays', 'Stacks', 'Queues', 'Trees'],
                'CS102': ['Sorting', 'Dynamic Programming'],
                'CS201': ['Normalization', 'Transactions'],
                'CS202': ['Deadlocks', 'CPU Scheduling']
            }
            
            for sub in subjects_data:
                if sub.course_code in topics_map:
                    for t_name in topics_map[sub.course_code]:
                        db.add(Topic(subject_id=sub.id, topic_name=t_name))
            db.commit()
            print("Seed data inserted successfully!")
        except Exception as e:
            print(f"Error seeding data: {e}")
            db.rollback()
        finally:
            db.close()
            
        print("Done!")

if __name__ == "__main__":
    reset_questions_table()

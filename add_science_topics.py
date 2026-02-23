from app.core.database import SessionLocal
from app.models.subject_topic import Subject, Topic

def add_data():
    db = SessionLocal()
    
    # Check if subjects exist
    math = db.query(Subject).filter(Subject.course_code == "MATH101").first()
    if not math:
        math = Subject(course_code="MATH101", subject_name="Mathematics")
        db.add(math)
        db.commit()
        db.refresh(math)
        
        # Add topics
        topics = ["Algebra", "Calculus", "Geometry", "Trigonometry", "Probability and Statistics", "Differential Equations", "Linear Algebra"]
        for t in topics:
            db.add(Topic(subject_id=math.id, topic_name=t))
        
        # Add a dummy course outcome
        from app.models.subject_topic import CourseOutcome
        db.add(CourseOutcome(subject_id=math.id, outcome_code="CO1", description="Understand mathematical concepts"))
        
        db.commit()
        print("Added Mathematics and topics.")
    else:
        print("Mathematics already exists.")

    phys = db.query(Subject).filter(Subject.course_code == "PHYS101").first()
    if not phys:
        phys = Subject(course_code="PHYS101", subject_name="Physics")
        db.add(phys)
        db.commit()
        db.refresh(phys)
        
        topics = ["Mechanics", "Electromagnetism", "Thermodynamics", "Quantum Mechanics", "Relativity", "Optics", "Nuclear Physics"]
        for t in topics:
            db.add(Topic(subject_id=phys.id, topic_name=t))
            
        from app.models.subject_topic import CourseOutcome
        db.add(CourseOutcome(subject_id=phys.id, outcome_code="CO1", description="Understand physical concepts"))
        db.commit()
        print("Added Physics and topics.")
    else:
        print("Physics already exists.")

    chem = db.query(Subject).filter(Subject.course_code == "CHEM101").first()
    if not chem:
        chem = Subject(course_code="CHEM101", subject_name="Chemistry")
        db.add(chem)
        db.commit()
        db.refresh(chem)
        
        topics = ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Analytical Chemistry", "Biochemistry", "Chemical Kinetics"]
        for t in topics:
            db.add(Topic(subject_id=chem.id, topic_name=t))
            
        from app.models.subject_topic import CourseOutcome
        db.add(CourseOutcome(subject_id=chem.id, outcome_code="CO1", description="Understand chemical concepts"))
            
        db.commit()
        print("Added Chemistry and topics.")
    else:
        print("Chemistry already exists.")

    db.close()

if __name__ == "__main__":
    add_data()

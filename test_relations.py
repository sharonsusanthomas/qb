from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.database import Question, QuestionStatus
from app.models.subject_topic import CourseOutcome, Subject
from app.api.dashboard import link_questions
from app.models.schemas import LinkQuestionsRequest, RelationType
import sys

def test_relations():
    db = SessionLocal()
    try:
        print("--- Testing Parent-Child Relation ---")
        # Create Parent
        p1 = Question(
            subject="Verification",
            topic="Hierarchy",
            bloom_level="RBT1",
            difficulty="EASY",
            marks=10,
            question_text="Parent Question: Explain DBMS architecture.",
            status=QuestionStatus.APPROVED
        )
        db.add(p1)
        db.commit()
        db.refresh(p1)
        print(f"Created Parent: ID {p1.id}")

        # Create Child
        c1 = Question(
            subject="Verification",
            topic="Hierarchy",
            bloom_level="RBT1",
            difficulty="EASY",
            marks=5,
            question_text="Child Question: Define DBMS.",
            status=QuestionStatus.DEDUPE_APPROVED
        )
        db.add(c1)
        db.commit()
        db.refresh(c1)
        print(f"Created Child: ID {c1.id}")

        # Link Child to Parent
        req = LinkQuestionsRequest(
            question_id=c1.id,
            target_id=p1.id,
            relation_type=RelationType.CHILD
        )
        link_questions(req, db)
        db.refresh(c1)
        
        if c1.parent_id == p1.id:
            print("✅ Child linked to Parent successfully.")
        else:
            print("❌ Failed to link Child to Parent.")

        print("\n--- Testing Parallel Relation ---")
        q1 = Question(
            subject="Verification",
            topic="Parallel",
            bloom_level="RBT1",
            difficulty="EASY",
            marks=5,
            question_text="Parallel Q1: TCP",
            status=QuestionStatus.APPROVED
        )
        q2 = Question(
            subject="Verification",
            topic="Parallel",
            bloom_level="RBT1",
            difficulty="EASY",
            marks=5,
            question_text="Parallel Q2: UDP",
            status=QuestionStatus.DEDUPE_APPROVED
        )
        db.add(q1)
        db.add(q2)
        db.commit()
        db.refresh(q1)
        db.refresh(q2)
        
        req_p = LinkQuestionsRequest(
            question_id=q2.id,
            target_id=q1.id,
            relation_type=RelationType.PARALLEL
        )
        link_questions(req_p, db)
        db.refresh(q1)
        db.refresh(q2)
        
        if q1.parallel_group_id == q2.parallel_group_id and q1.parallel_group_id is not None:
            print(f"✅ Parallel group established successfully (Group ID: {q1.parallel_group_id}).")
        else:
            print("❌ Failed to establish Parallel group.")

        print("\n--- Testing Selection Validation ---")
        from app.services.relation_service import RelationService
        
        # 1. Test Valid (Multiple children)
        # We need another child
        c2 = Question(
            subject="Verification", topic="Hierarchy", bloom_level="RBT1", difficulty="EASY", marks=5,
            question_text="Child Question 2: List DBMS components.", status=QuestionStatus.APPROVED, parent_id=p1.id
        )
        db.add(c2)
        db.commit()
        db.refresh(c2)
        
        is_valid, errs = RelationService.validate_selection(db, [c1.id, c2.id])
        if is_valid:
            print("✅ Validated multiple children selection (Valid).")
        else:
            print(f"❌ Failed to validate children: {errs}")

        # 2. Test Invalid (Parent + Child)
        is_valid, errs = RelationService.validate_selection(db, [p1.id, c1.id])
        if not is_valid:
            print(f"✅ Correctly blocked Parent+Child selection: {errs[0]}")
        else:
            print("❌ Failed to block Parent+Child selection.")

        # 3. Test Invalid (Parallel Group)
        is_valid, errs = RelationService.validate_selection(db, [q1.id, q2.id])
        if not is_valid:
            print(f"✅ Correctly blocked Parallel selection: {errs[0]}")
        else:
            print("❌ Failed to block Parallel selection.")

    finally:
        db.close()

if __name__ == "__main__":
    test_relations()

from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.database import Question

class RelationService:
    @staticmethod
    def validate_selection(db: Session, question_ids: List[int]) -> Tuple[bool, List[str]]:
        """
        Validates a list of questions against Hierarchy and Parallel rules.
        
        Returns:
            (is_valid, error_messages)
        """
        if not question_ids:
            return True, []

        questions = db.query(Question).filter(Question.id.in_(question_ids)).all()
        q_map = {q.id: q for q in questions}
        
        errors = []
        
        # 1. Hierarchy Check (No parent + child together)
        for q in questions:
            if q.parent_id and q.parent_id in q_map:
                errors.append(f"Conflict: Question #{q.id} (Child) and Question #{q.parent_id} (Parent) cannot both be selected.")
        
        # 2. Parallel Check (Only one from each parallel group)
        groups = {}
        for q in questions:
            if q.parallel_group_id:
                if q.parallel_group_id in groups:
                    groups[q.parallel_group_id].append(q.id)
                else:
                    groups[q.parallel_group_id] = [q.id]
        
        for group_id, member_ids in groups.items():
            if len(member_ids) > 1:
                ids_str = ", ".join([f"#{mid}" for mid in member_ids])
                errors.append(f"Conflict: Questions {ids_str} are mutually exclusive (Parallel Group {group_id}). Select only one.")
                
        return len(errors) == 0, errors

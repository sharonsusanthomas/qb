from app.models.schemas import BloomLevel
from app.services.prompt_builder import PromptBuilder


class QuestionValidator:
    """Validates generated questions for quality and compliance"""
    
    def __init__(self):
        self.prompt_builder = PromptBuilder()
    
    def validate_question(
        self,
        question_text: str,
        bloom_level: BloomLevel,
        marks: int
    ) -> tuple[bool, str]:
        """
        Validate a generated question
        
        Args:
            question_text: The generated question
            bloom_level: Expected Bloom's level
            marks: Expected marks
            
        Returns:
            Tuple of (is_valid, validation_message)
        """
        # Basic validation
        if not question_text or len(question_text.strip()) < 10:
            return False, "Question is too short"
        
        # Check for question mark (most questions should have one)
        if "?" not in question_text and not any(
            verb in question_text.lower() 
            for verb in ["explain", "describe", "discuss", "analyze", "evaluate", "design"]
        ):
            return False, "Question doesn't appear to be properly formatted"
        
        # Check for appropriate Bloom's verbs
        expected_verbs = self.prompt_builder.get_bloom_verbs(bloom_level)
        has_appropriate_verb = any(
            verb in question_text.lower() 
            for verb in expected_verbs
        )
        
        # Relaxed validation - just warn, don't fail
        if not has_appropriate_verb:
            validation_message = f"Warning: Question may not use appropriate {bloom_level.value} verbs"
        else:
            validation_message = "Question validated successfully"
        
        # Check length vs marks
        min_length = marks * 5  # Rough heuristic: 5 chars per mark
        if len(question_text) < min_length:
            return False, f"Question seems too short for {marks} marks"
        
        return True, validation_message

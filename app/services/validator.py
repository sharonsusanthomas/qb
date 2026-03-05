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
        Validate a generated question for quality and academic rigor
        """
        # Basic validation
        text_clean = question_text.strip()
        if not text_clean or len(text_clean) < 15:
            return False, "Question is too short"
        
        # Check for conversational filler (typical of bad LLM outputs)
        bad_starters = ["here is", "surely", "i can", "this is", "question:"]
        if any(text_clean.lower().startswith(bad) for bad in bad_starters):
            return False, "Question contains conversational filler"

        # Check for appropriate Bloom's verbs
        expected_verbs = self.prompt_builder.get_bloom_verbs(bloom_level)
        lower_q = text_clean.lower()
        has_appropriate_verb = any(verb in lower_q for verb in expected_verbs)
        
        # Rigor Check: For marks > 5, avoid simple "What is" or "Define"
        if marks > 5:
            forbidden_starters = ["what is", "define", "list the", "state the"]
            if any(lower_q.startswith(forbidden) for forbidden in forbidden_starters):
                return False, f"Question is too simplistic for {marks} marks. Use analytical phrasing."

        # Depth Check: Higher marks should imply structural complexity
        if marks >= 10 and not any(kw in lower_q for kw in ["explain", "analyze", "evaluate", "compare", "design", "illustrate", "derive", "case", "scenario"]):
            return False, f"University-level {marks}-mark questions require analytical depth (e.g., 'Analyze', 'Compare')."

        # Heuristic length check
        min_length = marks * 4 
        if len(text_clean) < min_length:
            return False, f"Question content seems insufficient for {marks} marks."
        
        if not has_appropriate_verb:
            return True, f"Warning: Question may not strictly use {bloom_level.value} action verbs."
            
        return True, "Question validated successfully"

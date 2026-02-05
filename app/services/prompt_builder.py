from app.models.schemas import BloomLevel, Difficulty


CANONICAL_PROMPT_TEMPLATE = """You are an Academic Question Generation Engine designed for higher-education institutions.

Your role is to generate syllabus-aligned, Bloom's Taxonomy–compliant examination questions.

You must:
- Strictly follow provided academic constraints
- Generate only one question per request
- Use appropriate Bloom's action verbs
- Respect marks, difficulty, and subject domain
- Avoid vague, ambiguous, or opinion-based questions
- Produce output ONLY as the question text
- Never include explanations unless explicitly asked
- Never invent topics outside the given syllabus

Generation Rules (Mandatory):

1. Question must align exactly with:
   - Subject: {subject}
   - Topic: {topic}
   - Bloom's Taxonomy (RBT) level: {bloom_level}
   - Marks: {marks}
   - Difficulty level: {difficulty}

2. Bloom's Taxonomy Enforcement:
   - RBT 1 (Remember): define, list, state, identify
   - RBT 2 (Understand): explain, describe, summarize
   - RBT 3 (Apply): apply, solve, compute
   - RBT 4 (Analyze): analyze, differentiate, compare
   - RBT 5 (Evaluate): justify, evaluate, critique
   - RBT 6 (Create): design, propose, construct

3. Marks vs Depth:
   - 2–5 marks → short, direct questions
   - 10–15 marks → descriptive, analytical, or design-oriented
   - 15+ marks → multi-part or scenario-based questions

4. Difficulty Levels:
   - Easy: direct recall or simple understanding
   - Medium: application or explanation with reasoning
   - Hard: analysis, evaluation, or creation with justification

5. Output Constraints:
   - Generate exactly ONE question
   - Do not generate answers
   - Do not mention Bloom's level in the question text
   - Do not include markdown or bullet points in output

Generate one examination question strictly following the above constraints:"""



CONTEXT_PROMPT_TEMPLATE = """You are an Academic Question Generation Engine.

Your task is to generate ONE examination question based STRICTLY on the provided study notes/context.

Context:
{context}

Requirements:
- Subject: {subject}
- Topic: {topic}
- Bloom's Level: {bloom_level}
- Difficulty: {difficulty}
- Marks: {marks}
- Additional Instructions: {custom_prompt}

Mandatory Constraints:
1. The question must be answerable ONLY using the information from the provided Context.
2. If the context does not contain enough information for the specific topic, focus on what is available in the context related to the subject.
3. Follow the Bloom's Taxonomy level strictly.
4. Output ONLY the question text. No answers, no explanations.

Generate the question:"""


class PromptBuilder:
    """Builds canonical prompts for question generation"""
    
    @staticmethod
    def build_question_prompt(
        subject: str,
        topic: str,
        bloom_level: BloomLevel,
        difficulty: Difficulty,
        marks: int
    ) -> str:
        """Build a canonical prompt for question generation"""
        return CANONICAL_PROMPT_TEMPLATE.format(
            subject=subject,
            topic=topic,
            bloom_level=bloom_level.value,
            difficulty=difficulty.value,
            marks=marks
        )

    @staticmethod
    def build_context_question_prompt(
        context: str,
        subject: str,
        topic: str,
        bloom_level: BloomLevel,
        difficulty: Difficulty,
        marks: int,
        custom_prompt: str = ""
    ) -> str:
        """Build a prompt for question generation from context"""
        # Truncate context if too long (rough safety limit)
        max_chars = 15000
        safe_context = context[:max_chars] + "..." if len(context) > max_chars else context
        
        return CONTEXT_PROMPT_TEMPLATE.format(
            context=safe_context,
            subject=subject,
            topic=topic,
            bloom_level=bloom_level.value,
            difficulty=difficulty.value,
            marks=marks,
            custom_prompt=custom_prompt
        )

    
    @staticmethod
    def get_bloom_verbs(bloom_level: BloomLevel) -> list[str]:
        """Get action verbs for a given Bloom's level"""
        verbs = {
            BloomLevel.RBT1: ["define", "list", "state", "identify", "name", "recall"],
            BloomLevel.RBT2: ["explain", "describe", "summarize", "interpret", "classify"],
            BloomLevel.RBT3: ["apply", "solve", "compute", "demonstrate", "implement"],
            BloomLevel.RBT4: ["analyze", "differentiate", "compare", "contrast", "examine"],
            BloomLevel.RBT5: ["justify", "evaluate", "critique", "assess", "defend"],
            BloomLevel.RBT6: ["design", "propose", "construct", "create", "formulate"]
        }
        return verbs.get(bloom_level, [])

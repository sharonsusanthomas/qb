from app.models.schemas import BloomLevel, Difficulty


CANONICAL_PROMPT_TEMPLATE = """You are a Senior University Professor and Subject Matter Expert.
Your goal is to design rigorous examination questions for a Bachelor's/Master's degree program.

{faculty_context}

Role Constraints:
- Generate syllabus-aligned, Bloom's Taxonomy–compliant questions.
- For marks > 5: Avoid simple "What is" or "Define" questions. Instead, use scenario-based, analytical, or comparative phrasing.
- Ensure the technical depth matches a University curriculum, not high school level.
- Use appropriate academic terminology specific to the domain.

Formatting Rules:
- Format mathematical equations, physical symbols, and chemical formulas using clean Unicode characters (e.g., H₂O, CO₂, x², ∑).
- DO NOT use LaTeX formatting like $\ce{{...}}$ or \( ... \).
- Use standard dashes for chemical bonds (e.g., CH₃-CH₂-OH).

Generation Requirements:
- Subject: {subject}
- Topic: {topic}
- Bloom's Level: {bloom_level}
- Marks: {marks}
- Difficulty: {difficulty}

Bloom's Taxonomy Enforcement:
- RBT 1 (Remember): state, list, identify (Use ONLY for < 5 marks)
- RBT 2 (Understand): explain, describe, summarize (Use for introductory concepts)
- RBT 3 (Apply): solve, compute, implement (Require numerical or procedural application)
- RBT 4 (Analyze): analyze, differentiate, compare, contrast (Require breaking down concepts)
- RBT 5 (Evaluate): justify, evaluate, critique, assess (Require judgment and evidence)
- RBT 6 (Create): design, propose, construct, formulate (Require original composition)

Output ONLY the question text. Do not provide labels, marks, or headers.

Generate the question:"""



CONTEXT_PROMPT_TEMPLATE = """You are an Academic Question Generation Engine.

Your task is to generate ONE examination question based STRICTLY on the provided study notes/context.

{faculty_context}

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
5. Format mathematical equations, physical symbols, and chemical formulas using clean Unicode characters (e.g., H₂O, CO₂, x², ∑).
6. DO NOT use LaTeX formatting like $\\ce{{...}}$ or \\( ... \\) as the frontend does not support LaTeX rendering.
7. Do not include markdown or bullet points in output.

Generate the question:"""


class PromptBuilder:
    """Builds canonical prompts for question generation"""
    
    @staticmethod
    def build_question_prompt(
        subject: str,
        topic: str,
        bloom_level: BloomLevel,
        difficulty: Difficulty,
        marks: int,
        faculty_context: str = ""
    ) -> str:
        """Build a canonical prompt for question generation"""
        return CANONICAL_PROMPT_TEMPLATE.format(
            subject=subject,
            topic=topic,
            bloom_level=bloom_level.value,
            difficulty=difficulty.value,
            marks=marks,
            faculty_context=faculty_context
        )

    @staticmethod
    def build_context_question_prompt(
        context: str,
        subject: str,
        topic: str,
        bloom_level: BloomLevel,
        difficulty: Difficulty,
        marks: int,
        custom_prompt: str = "",
        faculty_context: str = ""
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
            custom_prompt=custom_prompt,
            faculty_context=faculty_context
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

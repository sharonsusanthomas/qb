import logging
import json
from sqlalchemy.orm import Session
from app.models.database import FacultyPersona, GoldenQuestion
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)

STYLE_EXTRACTION_PROMPT = """You are an expert Educational Data Scientist and Linguistic Profiler. 
Your task is to analyze a set of academic questions written by a specific University Faculty member and reverse-engineer their teaching persona and stylistic thumbprint.

Analyze the following "Golden Questions" written by this faculty member:
{questions}

Based on the patterns in these questions, extract their stylistic profile into the following JSON format. Return ONLY valid JSON, without markdown formatting or introductory text.

{{
    "style_weights": {{
        "rigor": <float 0.0-1.0, representing how demanding/complex the questions are>,
        "practice": <float 0.0-1.0, representing focus on real-world/applied scenarios>,
        "theory": <float 0.0-1.0, representing focus on derivations, proofs, abstract concepts>
    }},
    "linguistic_thumbprint": {{
        "always_use": [
            <List of 2-3 specific phrases, tones, or structural habits they always use, e.g., "Consider a scenario where...", or using specific naming conventions>
        ],
        "never_use": [
            <List of 2-3 patterns they avoid, e.g., "Simplistic recall verbs", "Vague pronouns">
        ]
    }},
    "scenario_grounding": "<A 1-2 sentence description of the 'world' they build questions in, e.g., 'Focuses on Indian corporate finance scenarios', or 'Strictly theoretical physics environments in a vacuum'>"
}}
"""

class StyleAnalyzerService:
    def __init__(self, db: Session):
        self.db = db

    def analyze_persona(self, persona_id: int) -> dict:
        """Analyze golden questions for a persona and update their style profile."""
        persona = self.db.query(FacultyPersona).filter(FacultyPersona.id == persona_id).first()
        if not persona:
            raise ValueError(f"Persona with ID {persona_id} not found.")

        golden_questions = self.db.query(GoldenQuestion).filter(GoldenQuestion.faculty_persona_id == persona_id).all()
        
        if not golden_questions:
            return {"status": "error", "message": "No golden questions found to analyze."}

        question_texts = [f"Question {i+1}:\n{q.question_text}" for i, q in enumerate(golden_questions)]
        questions_block = "\n\n".join(question_texts)

        prompt = STYLE_EXTRACTION_PROMPT.format(questions=questions_block)
        logger.info(f"Extracting style profile for Persona '{persona.faculty_name}' from {len(golden_questions)} questions...")

        try:
            # Generate the JSON string using the LLM
            response_text = llm_client.generate(prompt)
            
            # Clean up response in case LLM added markdown backticks
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            
            extracted_profile = json.loads(response_text)
            
            # Update the persona in the database
            persona.style_weights = extracted_profile.get("style_weights")
            persona.linguistic_thumbprint = extracted_profile.get("linguistic_thumbprint")
            persona.scenario_grounding = extracted_profile.get("scenario_grounding")
            
            self.db.commit()
            self.db.refresh(persona)
            
            logger.info(f"Successfully updated style profile for Persona '{persona.faculty_name}'.")
            return {
                "status": "success", 
                "message": "Persona profile successfully updated.",
                "profile": extracted_profile
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM output as JSON: {e}\nRaw output: {response_text}")
            return {"status": "error", "message": "Failed to parse style profile from LLM output."}
        except Exception as e:
            logger.error(f"Error during style extraction: {e}")
            return {"status": "error", "message": str(e)}

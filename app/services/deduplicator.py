import torch
from sentence_transformers import SentenceTransformer, util
from sklearn.feature_extraction.text import TfidfVectorizer
from sqlalchemy.orm import Session
from app.models.database import Question, QuestionStatus, DuplicateMatch
from app.core.config import get_settings
from langchain_openai import ChatOpenAI
import re
import json
import logging

settings = get_settings()
logger = logging.getLogger(__name__)

class DeduplicationService:
    _model = None
    
    def __init__(self, db: Session):
        self.db = db
        # Lazy load model
        if DeduplicationService._model is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Loading SentenceTransformer model on {device}...")
            DeduplicationService._model = SentenceTransformer("all-MiniLM-L6-v2", device=device)
        
        self.model = DeduplicationService._model
        self.llm = ChatOpenAI(
            temperature=0, # Low temperature for logical reasoning
            model=settings.MODEL,
            openai_api_key=settings.GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )

    def normalize(self, text):
        return re.sub(r"[^\w\s%]", "", text.lower()).strip()

    def get_numbers(self, text):
        return set(re.findall(r"\d+", text))

    def check_layer2_ambiguity(self, q_new, q_match, vector_sim):
        tfidf = TfidfVectorizer().fit_transform([q_new, q_match])
        lexical_sim = (tfidf * tfidf.T).toarray()[0, 1]

        nums_new = self.get_numbers(q_new)
        nums_match = self.get_numbers(q_match)

        # Higher similarity threshold for layer 2
        if (vector_sim > 0.85 and lexical_sim < 0.70) or nums_new != nums_match:
            return True
        return False

    def call_agent_reasoning(self, q1, q2):
        prompt = f"""
        Compare these two questions for logical identity.

        Q1: {q1}
        Q2: {q2}

        Decide:
        - DUPLICATE: For logical identity (even if words differ slightly)
        - CONFLICT: Same question but with different answers or facts
        - PARENT_OF: Q1 is a larger concept that fully contains Q2 (e.g., Q1: "Explain DBMS", Q2: "Define DBMS")
        - CHILD_OF: Q1 is a subset/part of the larger concept in Q2
        - PARALLEL_TO: Questions at the same level, alternative versions of similar topic (e.g., Q1: "TCP", Q2: "UDP")
        - UNIQUE: Different topics or concepts

        Return ONLY JSON:
        {{"verdict":"DUPLICATE|CONFLICT|PARENT_OF|CHILD_OF|PARALLEL_TO|UNIQUE","reason":"brief explanation"}}
        """
        
        try:
            response = self.llm.invoke(prompt)
            # Try to extract JSON if it's wrapped in markers
            content = response.content.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "{" in content:
                content = content[content.find("{"):content.rfind("}")+1]
                
            return json.loads(content)
        except Exception as e:
            logger.error(f"LLM reasoning failed: {e}")
            return {"verdict": "ERROR", "reason": str(e)}

    def check_question(self, target_question: Question, sim_threshold=0.85):
        """
        Check a single question against all approved/deduped questions in the DB
        """
        from app.services.logger_service import log
        log.process(f"Analyzing Question #{target_question.id}: '{target_question.question_text[:50]}...'")

        # Get all existing questions that are NOT the current one and are APPROVED or DEDUPE_APPROVED
        existing_questions = self.db.query(Question).filter(
            Question.id != target_question.id,
            Question.status.in_([QuestionStatus.APPROVED, QuestionStatus.DEDUPE_APPROVED])
        ).all()
        
        if not existing_questions:
            log.info("No existing questions found to compare against. Skipping.")
            return []

        q_texts = [q.question_text for q in existing_questions]
        
        # Semantic similarity
        log.ai("Encoding question into mathematical vectors...")
        new_emb = self.model.encode(target_question.question_text, convert_to_tensor=True)
        ext_embs = self.model.encode(q_texts, convert_to_tensor=True)
        scores = util.cos_sim(new_emb, ext_embs)[0]

        matches_found = []

        for i, score in enumerate(scores):
            score_val = score.item()
            if score_val >= sim_threshold:
                match_question = existing_questions[i]
                log.info(f"High similarity ({score_val*100:.0f}%) found with Question #{match_question.id}")
                
                # Layer 2: Lexical + Numeric check
                ambiguous = self.check_layer2_ambiguity(
                    target_question.question_text, 
                    match_question.question_text, 
                    score_val
                )

                if ambiguous:
                    log.process("Semantic match is high but text is different. Consulting AI Brain for a logical verdict...")
                    # Layer 3: LLM reasoning
                    verdict_data = self.call_agent_reasoning(
                        target_question.question_text, 
                        match_question.question_text
                    )
                    log.ai(f"AI Verdict: {verdict_data.get('verdict')} - {verdict_data.get('reason')}")
                else:
                    log.info("Direct Duplicate detected (High semantic and numeric match).")
                    verdict_data = {
                        "verdict": "DUPLICATE",
                        "reason": "High semantic and numeric match",
                    }

                # Save match if it's flagged as DUPLICATE, CONFLICT, or any RELATION
                if verdict_data["verdict"] in ["DUPLICATE", "CONFLICT", "PARENT_OF", "CHILD_OF", "PARALLEL_TO"]:
                    match_data = {
                        "match_question_id": match_question.id,
                        "match_question_text": match_question.question_text,
                        "similarity_score": round(score_val, 2),
                        "verdict": verdict_data["verdict"],
                        "reason": verdict_data.get("reason", "")
                    }
                    
                    # If we want to persist immediately (for history/reporting)
                    match_record = DuplicateMatch(
                        question_id=target_question.id,
                        match_question_id=match_question.id,
                        similarity_score=match_data["similarity_score"],
                        verdict=match_data["verdict"],
                        reason=match_data["reason"]
                    )
                    self.db.add(match_record)
                    matches_found.append(match_data)

        # Automatic status update based on finding matches
        if matches_found:
            log.error(f"Flagging Question #{target_question.id} as a DUPLICATE.")
            target_question.status = QuestionStatus.DUPLICATE_FLAGGED
        else:
            log.success(f"Question #{target_question.id} is UNIQUE. Moving to approval.")
            target_question.status = QuestionStatus.DEDUPE_APPROVED
            
        self.db.commit()
        return matches_found

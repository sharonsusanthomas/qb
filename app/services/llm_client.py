from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from app.core.config import get_settings

settings = get_settings()


class LLMClient:
    """Client for interacting with Groq LLM"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            temperature=0.7,  # Slightly higher for creative question generation
            model=settings.MODEL,
            openai_api_key=settings.GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
            tiktoken_model_name="gpt-3.5-turbo"
        )
    
    def generate(self, prompt: str) -> str:
        """Generate text using the LLM"""
        messages = [HumanMessage(content=prompt)]
        response = self.llm.invoke(messages)
        return response.content.strip()


# Singleton instance
llm_client = LLMClient()

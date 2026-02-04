from langchain_openai import ChatOpenAI

from config.cfg import MODEL, GROQ_API_KEY

llm = ChatOpenAI(
    temperature=0,
    model=MODEL,
    openai_api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
    tiktoken_model_name="gpt-3.5-turbo"
)

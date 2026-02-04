from langchain_core.messages import HumanMessage
from src.llm import llm


def complete_text(prompt: str, function_calling=False, custom_function=None) -> str:
    messages = [HumanMessage(content=prompt)]

    response = llm.invoke(messages)
    return response.content

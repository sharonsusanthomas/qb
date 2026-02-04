
from langchain_text_splitters import TokenTextSplitter
from langchain_community.document_loaders import PyPDFLoader

from config.cfg import CONTENT_FILEPATH


def load_and_split_doc() -> None:
    # Load document
    loader = PyPDFLoader(CONTENT_FILEPATH)
    documents = loader.load()
    # Split document by max tokens allowed
    # Note: Using gpt-3.5-turbo for tokenization even though we're using Grok for generation
    # because tiktoken doesn't recognize grok-beta
    doc_splitter = TokenTextSplitter(model_name="gpt-3.5-turbo", chunk_size=3500, chunk_overlap=0)
    docs = doc_splitter.split_documents(documents)
    texts = list(map(lambda doc: doc.page_content, docs))
    return texts

import os

from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = os.getenv("MODEL", "llama-3.3-70b-versatile")

DATA_FOLDER = "data"
CONTENT_FILENAME = "content.pdf"
CONTENT_FILEPATH = os.path.join(DATA_FOLDER, CONTENT_FILENAME)
OUTPUT_FOLDER = "output"

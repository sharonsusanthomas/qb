from pypdf import PdfReader
from io import BytesIO

class PDFService:
    """Service for handling PDF operations"""
    
    @staticmethod
    def extract_text(file_content: bytes) -> str:
        """
        Extract text from a PDF file
        
        Args:
            file_content: Raw bytes of the PDF file
            
        Returns:
            Extracted text content
        """
        try:
            reader = PdfReader(BytesIO(file_content))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")

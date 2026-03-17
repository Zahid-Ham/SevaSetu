from google.cloud import documentai  # type: ignore
from app.config.google_config import document_ai_client, PROCESSOR_NAME  # type: ignore

def process_document(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """
    Sends document image bytes to Google Document AI and returns extracted text.
    
    Args:
        image_bytes: The raw bytes of the image/document.
        mime_type: The MIME type of the document (default: image/jpeg).
        
    Returns:
        The extracted raw text from the document.
    """
    # Load binary data into Document AI RawDocument object
    raw_document = documentai.RawDocument(content=image_bytes, mime_type=mime_type)

    # Configure the process request
    request = documentai.ProcessRequest(name=PROCESSOR_NAME, raw_document=raw_document)

    # Use the Document AI client to process the document
    result = document_ai_client.process_document(request=request)

    # Extract full OCR text from the response
    document = result.document
    return document.text

import google.generativeai as genai  # type: ignore
import os
import json
import base64
from dotenv import load_dotenv  # type: ignore

# Load environment variables
load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')


def process_image_and_extract(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Uses Google Gemini Vision to directly read a form image and extract 
    structured fields WITHOUT needing Google Document AI.
    
    Args:
        image_bytes: Raw bytes of the image.
        mime_type: MIME type of the image (e.g., image/jpeg).
        
    Returns:
        A dictionary with extracted fields: name, phone, location, issue_type, description.
    """
    prompt = """
You are an intelligent form reader. Look at this image of a handwritten complaint/survey form.

Extract the following fields from the form:
- Name: The name of the person who filled the form
- Phone: The person's phone number
- Location: Where the problem/issue is from
- Issue Type: What type of problem or issue (e.g., water shortage, electricity, road damage)
- Description: A brief description of the issue

Return ONLY valid JSON in this exact format, nothing else:
{
  "name": "value here or empty string if not found",
  "phone": "value here or empty string if not found",
  "location": "value here or empty string if not found",
  "issue_type": "value here or empty string if not found",
  "description": "value here or empty string if not found",
  "raw_text": "full text you could read from the image"
}
"""
    # Pass image inline as base64-encoded part
    image_part = {
        "mime_type": mime_type,
        "data": base64.b64encode(image_bytes).decode("utf-8")
    }

    response = model.generate_content([prompt, image_part])

    text_content = response.text.strip()
    # Clean up code fences if Gemini wraps in markdown blocks
    if text_content.startswith("```json"):
        text_content = text_content[7:]
        text_content = text_content.rsplit("```", 1)[0]
    elif text_content.startswith("```"):
        text_content = text_content[3:]
        text_content = text_content.rsplit("```", 1)[0]

    try:
        data = json.loads(text_content.strip())
        return data
    except json.JSONDecodeError as e:
        print(f"Error parsing Gemini response: {e}")
        # Fallback: return what we could read
        return {
            "name": "",
            "phone": "",
            "location": "",
            "issue_type": "",
            "description": text_content,
            "raw_text": text_content
        }


def parse_ocr_text(raw_text: str) -> dict:
    """
    Uses Google Gemini to extract structured fields from raw OCR text.
    This is kept as a secondary parser if you want to use Document AI separately.
    """
    prompt = f"""
    Extract structured fields from this OCR text.

    Fields required:
    Name
    Phone
    Location
    Issue Type
    Description

    Return JSON only.

    OCR Text:
    {raw_text}

    Ensure the response is valid JSON.
    """

    response = model.generate_content(prompt)
    
    text_content = response.text.strip()
    if text_content.startswith("```json"):
        text_content = text_content[7:-3]
    elif text_content.startswith("```"):
        text_content = text_content[3:-3]
    
    try:
        return json.loads(text_content)
    except json.JSONDecodeError as e:
        print(f"Error parsing Gemini response: {e}")
        return {
            "name": "",
            "phone": "",
            "location": "",
            "issue_type": "",
            "description": text_content
        }

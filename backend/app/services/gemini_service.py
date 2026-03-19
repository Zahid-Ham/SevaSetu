import google.generativeai as genai  # type: ignore
import os
import json
import base64
from dotenv import load_dotenv  # type: ignore

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

def process_document_and_extract(file_bytes: bytes, mime_type: str) -> dict:
    """
    Uses Google Gemini Vision to read a document (Image or PDF) and extract 
    highly structured 20+ parameter fields.
    """
    prompt = """
You are an intelligent social infrastructure surveyor. Analyze the provided document (which could be a handwritten form, a typed report, or an image of an issue) and extract comprehensive structured data.

Extract the following fields. If a field is not present or cannot be inferred, return null for it (or empty array for lists).

Metadata:
- citizen_name (string): Name of the reporter or citizen
- phone (string): Phone number
- precise_location (string): Where the problem is
- gps_coordinates (string): Any mentioned GPS coords
- demographic_tally (number): Household size or tally marks

Problem Details:
- primary_category (string): Classify into: Water, Sanitation, Infrastructure, Health, Education, Safety, or Other
- sub_category (string): Specific issue (e.g., Piped Water Supply, Roads)
- problem_status (string): Active/Persistent, Resolved, or Recurring
- duration_of_problem (string): E.g., '3 weeks', '2 months'
- urgency_level (string): Immediate, Critical, Moderate, Low
- service_status (string): Active or Inactive

Impact & Severity:
- severity_score (number): Calculate a score from 1 to 10 based on the text context (10 being most severe/dangerous)
- population_affected (number): Estimate or exact number of people affected
- vulnerability_flag (string): High, Medium, Low (based on demographics mentioned like children/elderly)
- secondary_impact (string): Follow-on effects

Qualitative:
- key_complaints (array of strings): 3-5 keywords summarizing complaints
- sentiment (string): Hopeful, Angry, Desperate, Frustrated, Neutral
- key_quote (string): A direct quote if applicable
- description (string): Detailed summary of what was written

Return ONLY valid JSON in this exact structure, nothing else:
{
  "citizen_name": "",
  "phone": "",
  "precise_location": "",
  "gps_coordinates": "",
  "demographic_tally": null,
  "primary_category": "",
  "sub_category": "",
  "problem_status": "",
  "duration_of_problem": "",
  "urgency_level": "",
  "service_status": "",
  "severity_score": null,
  "population_affected": null,
  "vulnerability_flag": "",
  "secondary_impact": "",
  "key_complaints": [],
  "sentiment": "",
  "key_quote": "",
  "description": "",
  "auto_category": "" // Same as primary_category
}
"""
    file_part = {
        "mime_type": mime_type,
        "data": base64.b64encode(file_bytes).decode("utf-8")
    }

    try:
        response = model.generate_content([prompt, file_part])
        text_content = response.text.strip()
        
        if text_content.startswith("```json"):
            text_content = text_content[7:]
            text_content = text_content.rsplit("```", 1)[0]
        elif text_content.startswith("```"):
            text_content = text_content[3:]
            text_content = text_content.rsplit("```", 1)[0]

        data = json.loads(text_content.strip())
        return data
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        return {"description": "Could not parse document correctly."}

def generate_field_report_from_multimedia(photo_bytes: bytes, audio_transcript: str, location: str) -> dict:
    """
    Synthesizes a field report from a photo, a voice transcript, and GPS coordinates.
    """
    prompt = f"""
You are an expert civic analyst recording a field report from an NGO worker. 
You are given a photo of the incident, a text transcript of the worker's voice note, and GPS coordinates.

Voice Transcript: "{audio_transcript}"
GPS/Location String: "{location}"

Analyze the photo alongside the transcript to generate a highly structured report matching the exact JSON format below.
Calculate severity mathematically and determine urgency based on visual and spoken evidence.

Return ONLY valid JSON:
{{
  "citizen_name": "Field Worker",
  "precise_location": "{location}",
  "primary_category": "Classify into Water/Sanitation/Infrastructure/Health/Education/Safety/Other",
  "sub_category": "",
  "problem_status": "Active/Persistent",
  "urgency_level": "Immediate/Critical/Moderate/Low",
  "severity_score": null, /* 1 to 10 */
  "key_complaints": ["keyword1", "keyword2"],
  "sentiment": "Based on voice tone",
  "description": "Comprehensive summary of visual evidence + spoken words",
  "auto_category": "Same as primary_category"
}}
"""
    file_part = {
        "mime_type": "image/jpeg",
        "data": base64.b64encode(photo_bytes).decode("utf-8")
    }

    try:
        response = model.generate_content([prompt, file_part])
        text_content = response.text.strip()
        
        if text_content.startswith("```json"):
            text_content = text_content[7:]
            text_content = text_content.rsplit("```", 1)[0]
        elif text_content.startswith("```"):
            text_content = text_content[3:]
            text_content = text_content.rsplit("```", 1)[0]

        data = json.loads(text_content.strip())
        return data
    except Exception as e:
        print(f"Error parsing Field Report: {e}")
        return {"description": audio_transcript, "precise_location": location}

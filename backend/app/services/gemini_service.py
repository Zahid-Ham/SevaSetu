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

Extract the following fields. 

CRITICAL INSTRUCTION: Do NOT leave any fields blank or null. If a field is not explicitly mentioned in the document, use your intelligence and the surrounding context to infer, generate, or provide a highly probable and helpful value. For example, if no description is written but keywords are present, write a 2-3 sentence description summarizing the problem.

Metadata:
- citizen_name (string): Name of the reporter or citizen
- phone (string): Phone number
- precise_location (string): Where the problem is
- gps_coordinates (string): Any mentioned GPS coords
- demographic_tally (number): Household size or tally marks

Problem Details:
- executive_summary (string): A concise 1-sentence summary of the entire problem.
- primary_category (string): Classify into ONE of: Water, Sanitation, Infrastructure, Health, Education, Safety, or Other.
- sub_category (string): Specific issue (e.g., Piped Water Supply, Roads).
- problem_status (string): Active/Persistent, Resolved, or Recurring
- duration_of_problem (string): E.g., '3 weeks', '2 months'. If not mentioned, estimate based on context.
- urgency_level (string): Immediate, Critical, Moderate, Low
- service_status (string): Active or Inactive

Impact & Severity:
- severity_score (number): Calculate a score from 1 to 10 based on the text context (10 being most severe/dangerous)
- severity_reason (string): Provide a 2-3 sentence logical justification for why this specific score was given.
- population_affected (number): Estimate or exact number of people affected
- vulnerable_group (string): Identify the most affected group: women, children, elderly, or disabled.
- vulnerability_flag (string): High, Medium, Low (based on demographics mentioned like children/elderly)
- secondary_impact (string): Follow-on effects

Action & Follow-up (AI Predicted):
- expected_resolution_timeline (list of strings): AI powered prediction of phases (e.g., ["Phase 1: Verification (3 days)", "Phase 2: Approval (7 days)", "Phase 3: Work (14 days)"]).
- detailed_resolution_steps (list of strings): A more granular, low-level list of 5-7 specific technical or administrative steps required for resolution.
- govt_scheme_applicable (string): Identify any relevant Indian Government scheme (e.g., Jal Jeevan Mission, PMGSY).
- ai_recommended_actions (string): 2-3 specific steps that should be taken immediately. USE BULLET POINTS.

Qualitative:
- key_complaints (array of strings): 3-5 keywords summarizing complaints
- sentiment (string): Hopeful, Angry, Desperate, Frustrated, Neutral
- key_quote (string): A direct quote if applicable
- description (string): Detailed summary of what was written. USE BULLET POINTS for key findings.

Return ONLY valid JSON in this exact structure, nothing else:
{
  "citizen_name": "",
  "phone": "",
  "precise_location": "",
  "gps_coordinates": "",
  "demographic_tally": null,
  "executive_summary": "",
  "primary_category": "",
  "sub_category": "",
  "problem_status": "",
  "duration_of_problem": "",
  "urgency_level": "",
  "service_status": "",
  "severity_score": null,
  "severity_reason": "",
  "population_affected": null,
  "vulnerable_group": "",
  "vulnerability_flag": "",
  "secondary_impact": "",
  "expected_resolution_timeline": [],
  "detailed_resolution_steps": [],
  "govt_scheme_applicable": "",
  "ai_recommended_actions": "",
  "key_complaints": [],
  "sentiment": "",
  "key_quote": "",
  "description": "",
  "auto_category": ""
}
"""
    file_part = {
        "mime_type": mime_type,
        "data": base64.b64encode(file_bytes).decode("utf-8")
    }

    try:
        print("\n--- [Gemini Vision Engine] Processing document extraction ---")
        print(f"[Gemini Vision Engine] MIME Type: {mime_type}, Bytes: {len(file_bytes)}")
        
        response = model.generate_content([prompt, file_part])
        text_content = response.text.strip()
        
        print("\n--- [Gemini Vision Engine] SUCCESS. Raw Response preview: ---")
        print(text_content[:300] + "..." if len(text_content) > 300 else text_content)

        if text_content.startswith("```json"):
            text_content = text_content[7:]
            text_content = text_content.rsplit("```", 1)[0]
        elif text_content.startswith("```"):
            text_content = text_content[3:]
            text_content = text_content.rsplit("```", 1)[0]

        data = json.loads(text_content.strip())
        print(f"[Gemini Vision Engine] Parsed JSON successfully. Category: {data.get('primary_category')}")
        return data
    except Exception as e:
        print(f"\n!!! [Gemini Vision ERROR] !!!")
        print(f"Error Detail: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"description": "Could not parse document correctly.", "error": str(e)}

def analyze_multimodal_attachment(file_bytes: bytes, mime_type: str, mission_name: str, file_name: str) -> dict:
    """
    Direct multimodal analysis of PDFs and Images using Gemini 2.0 Flash.
    Bypasses Document AI and Service Account key dependencies.
    """
    prompt = f"""
    You are a strategic NGO Mission Auditor for SevaSetu.
    You are analyzing an attachment (PDF or Image) named '{file_name}' for the mission '{mission_name}'.

    YOUR TASK:
    1. READ the entire document/image content (even tables, names, and dates).
    2. Identify exactly what this is (e.g., 'Ground report', 'Participant list', 'Notice').
    3. Summarize the key data in 2-3 specific sentences.
    4. Evaluate its RELEVANCE specifically to the mission '{mission_name}'.
    5. If relevant, explain the impact. If irrelevant, provide a professional explanation.

    Return ONLY valid JSON in this exact structure:
    {{
      "file_summary": "Deep summary of extracted content",
      "relevance_score": 1-10,
      "relevance_explanation": "Strategic connection to '{mission_name}'",
      "action_recommended": "Specific recommendation for the supervisor"
    }}
    """
    
    file_part = {
        "mime_type": mime_type,
        "data": base64.b64encode(file_bytes).decode("utf-8")
    }

    try:
        print(f"\n--- [Gemini Multimodal Engine] Directly analyzing '{file_name}' ---")
        response = model.generate_content([prompt, file_part])
        text_content = response.text.strip()
        
        if text_content.startswith("```json"):
            text_content = text_content[7:]
            text_content = text_content.rsplit("```", 1)[0]
        elif text_content.startswith("```"):
            text_content = text_content[3:]
            text_content = text_content.rsplit("```", 1)[0]

        return json.loads(text_content.strip())
    except Exception as e:
        print(f"!!! [Gemini Multimodal ERROR] {file_name}: {e}")
        return {
            "file_summary": "Multimodal analysis failed.",
            "relevance_score": 5,
            "relevance_explanation": "AI could not process this file due to an error.",
            "action_recommended": "Manual audit required."
        }

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

CRITICAL INSTRUCTION: Do NOT leave any fields blank or null. Use your intelligence and the surrounding context (visual evidence + transcript) to infer, generate, or provide a highly probable and helpful value.

Return ONLY valid JSON:
{{
  "citizen_name": "Field Worker",
  "precise_location": "{location}",
  "executive_summary": "Concise 1-sentence summary of the incident",
  "primary_category": "Classify into ONE of: Water, Sanitation, Infrastructure, Health, Education, Safety, or Other",
  "sub_category": "",
  "problem_status": "Active/Persistent",
  "urgency_level": "Immediate/Critical/Moderate/Low",
  "duration_of_problem": "Estimate if not mentioned",
  "severity_score": null, /* 1 to 10 */
  "severity_reason": "2-3 sentence logical justification for the score",
  "population_affected": null, /* Estimate */
  "vulnerable_group": "women/children/elderly/disabled",
  "vulnerability_flag": "High/Medium/Low",
  "expected_resolution_timeline": ["Phase 1: ...", "Phase 2: ..."],
  "detailed_resolution_steps": ["Week 1 - Week 2: Initial Assessment", "Week 3 - Week 4: Resource Allocation", "Week 5 - Week 8: Implementation", "Week 9 - Week 10: Final Verification"],
  "govt_scheme_applicable": "Relevant Indian scheme",
  "ai_recommended_actions": "2-3 specific steps in BULLET POINTS",
  "key_complaints": ["keyword1", "keyword2"],
  "sentiment": "Based on voice tone",
  "description": "Comprehensive summary of visual evidence + spoken words in BULLET POINTS",
  "auto_category": "Same as primary_category"
}}
"""
    file_part = {
        "mime_type": "image/jpeg",
        "data": base64.b64encode(photo_bytes).decode("utf-8")
    }

    try:
        print("\n--- [Gemini Field Report Engine] Synthesizing multimedia report ---")
        print(f"[Gemini Field Report Engine] Transcript Length: {len(audio_transcript)}")
        
        response = model.generate_content([prompt, file_part])
        text_content = response.text.strip()
        
        print("\n--- [Gemini Field Report Engine] SUCCESS ---")

        if text_content.startswith("```json"):
            text_content = text_content[7:]
            text_content = text_content.rsplit("```", 1)[0]
        elif text_content.startswith("```"):
            text_content = text_content[3:]
            text_content = text_content.rsplit("```", 1)[0]

        data = json.loads(text_content.strip())
        return data
    except Exception as e:
        print(f"\n!!! [Gemini Field Report ERROR] !!!")
        print(f"Error Detail: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"description": audio_transcript, "precise_location": location, "error": str(e)}

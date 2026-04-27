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
# Initialize Gemini with 2.5-Flash for strategic missions
model = genai.GenerativeModel('gemini-2.5-flash')

# ─── Bilingual Instruction ────────────────────────────────────────────────────
# Injected into all prompts so text fields return {"en": "...", "hi": "..."}
BILINGUAL_INSTRUCTION = """
BILINGUAL OUTPUT INSTRUCTION (MANDATORY):
For EVERY text field in the JSON response (string values only — NOT numbers or booleans),
you MUST return a bilingual object instead of a plain string.
Format: {"en": "English text here", "hi": "हिंदी अनुवाद यहाँ"}

For arrays of text strings, each ELEMENT must be a bilingual object:
[{"en": "First point", "hi": "पहला बिंदु"}, ...]

Exception: citizen_name, phone, gps_coordinates, precise_location stay as plain strings.
Exception: All numeric fields (severity_score, population_affected, etc.) stay as numbers.

IMPORTANT: The Hindi must be accurate, natural, and use proper civic/NGO terminology.
"""

def process_document_and_extract(file_bytes: bytes, mime_type: str) -> dict:
    """
    Uses Google Gemini Vision to read a document (Image or PDF) and extract 
    highly structured 20+ parameter fields.
    """
    prompt = """
You are an intelligent social infrastructure surveyor. Analyze the provided document (which could be a handwritten form, a typed report, or an image of an issue) and extract comprehensive structured data.

CRITICAL INSTRUCTION: Do NOT leave text fields blank or null. If a field is not explicitly mentioned in the document, use your intelligence and the surrounding context to infer, generate, or provide a highly probable and helpful value.

NUMERIC INSTRUCTION: For numeric fields like 'population_affected' or 'demographic_tally', do NOT guess. Only provide a number if there is direct evidence. If no direct evidence is found, return 0 or null.

""" + BILINGUAL_INSTRUCTION + """

Metadata (plain strings — do NOT wrap in bilingual objects):
- citizen_name (string)
- phone (string)
- precise_location (string)
- gps_coordinates (string)
- demographic_tally (number)

All other text fields MUST be bilingual {"en": ..., "hi": ...} objects:
- executive_summary, primary_category, sub_category, problem_status,
  duration_of_problem, urgency_level, service_status,
  severity_reason, vulnerable_group, vulnerability_flag, secondary_impact,
  govt_scheme_applicable, ai_recommended_actions, sentiment, key_quote,
  description, auto_category

Array fields where EACH element is a bilingual object:
- expected_resolution_timeline, detailed_resolution_steps, key_complaints

Numeric fields (stay as numbers): severity_score, population_affected

Return ONLY valid JSON:
{
  "citizen_name": "",
  "phone": "",
  "precise_location": "",
  "gps_coordinates": "",
  "demographic_tally": null,
  "executive_summary": {"en": "", "hi": ""},
  "primary_category": {"en": "", "hi": ""},
  "sub_category": {"en": "", "hi": ""},
  "problem_status": {"en": "", "hi": ""},
  "duration_of_problem": {"en": "", "hi": ""},
  "urgency_level": {"en": "", "hi": ""},
  "service_status": {"en": "", "hi": ""},
  "severity_score": null,
  "severity_reason": {"en": "", "hi": ""},
  "population_affected": null,
  "vulnerable_group": {"en": "", "hi": ""},
  "vulnerability_flag": {"en": "", "hi": ""},
  "secondary_impact": {"en": "", "hi": ""},
  "expected_resolution_timeline": [{"en": "", "hi": ""}],
  "detailed_resolution_steps": [{"en": "", "hi": ""}],
  "govt_scheme_applicable": {"en": "", "hi": ""},
  "ai_recommended_actions": {"en": "", "hi": ""},
  "key_complaints": [{"en": "", "hi": ""}],
  "sentiment": {"en": "", "hi": ""},
  "key_quote": {"en": "", "hi": ""},
  "description": {"en": "", "hi": ""},
  "auto_category": {"en": "", "hi": ""}
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

def analyze_ocr_content(ocr_text: str, mission_name: str, file_name: str) -> dict:
    """
    Strategic reasoning over OCR-extracted text.
    Determines relevance and provides mission-aligned summaries.
    """
    def _call_gemini():
        prompt = f"""
        You are a strategic NGO Mission Auditor for SevaSetu.
        You are analyzing the TEXT EXTRACTED (via OCR) from an attachment: '{file_name}'.
        The discussion context is the mission: '{mission_name}'.

        EXTRACTED TEXT:
        \"\"\"
        {ocr_text}
        \"\"\"

        YOUR TASK:
        1. Identify the document type (e.g., 'Participant List', 'Legal Notice', 'Memo').
        2. Summarize the key data (names, dates, core message) in 2-3 specific sentences.
        3. Evaluate its RELEVANCE specifically to the mission '{mission_name}'.
        4. If relevant, explain the impact on the mission.
        5. If irrelevant, provide a professional explanation why.

        Return ONLY valid JSON in this exact structure:
        {{
          "file_summary": "Deep summary of extracted content",
          "relevance_score": 1-10,
          "relevance_explanation": "Strategic connection to '{mission_name}'",
          "action_recommended": "Specific recommendation for the supervisor"
        }}
        """

        print(f"\n--- [Gemini Reasoning Engine] Processing OCR for '{file_name}' ---")
        from app.services.ai_service import ai_manager
        import asyncio
        text_content = asyncio.run(ai_manager.generate_text(prompt))
        
        if not text_content:
            return {
                "file_summary": "AI reasoning failed to generate a response.",
                "relevance_score": 0,
                "relevance_explanation": "Critical error in AI fallback chain.",
                "action_recommended": "Contact system administrator."
            }
        
        if text_content.startswith("```json"):
            text_content = text_content[7:]
            text_content = text_content.rsplit("```", 1)[0]
        elif text_content.startswith("```"):
            text_content = text_content[3:]
            text_content = text_content.rsplit("```", 1)[0]

        return json.loads(text_content.strip())

    try:
        from app.services.chat_analysis_service import retry_with_backoff # type: ignore
        return retry_with_backoff(_call_gemini)
    except Exception as e:
        print(f"!!! [Gemini Reasoning ERROR] {file_name}: {e}")
        return {
            "file_summary": "Extracted text was received but AI analysis failed.",
            "relevance_score": 5,
            "relevance_explanation": "AI could not determine relevance due to a processing error.",
            "action_recommended": "Manual audit required."
        }

def analyze_multimodal_attachment(file_bytes: bytes, mime_type: str, mission_name: str, file_name: str) -> dict:
    """
    Direct multimodal analysis of PDFs and Images using Gemini 2.0 Flash with retry logic.
    (Kept for fallback if needed, but primary is now OCR-based).
    """
    def _call_gemini():
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

    try:
        # Import retry locally if needed or use the one from chat_analysis_service
        from app.services.chat_analysis_service import retry_with_backoff # type: ignore
        return retry_with_backoff(_call_gemini)
    except Exception as e:
        print(f"!!! [Gemini Multimodal ERROR] {file_name}: {e}")
        return {
            "file_summary": "Multimodal analysis failed or rate limited.",
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

Analyze the photo alongside the transcript to generate a highly structured report.

CRITICAL INSTRUCTION: Do NOT leave text fields blank or null. Use your intelligence and the surrounding context (visual evidence + transcript) to infer, generate, or provide a highly probable and helpful value.

NUMERIC INSTRUCTION: For numeric fields like 'population_affected' or 'severity_score', do NOT guess large numbers. Only provide a number if there is direct evidence in the image or audio. If no direct evidence for population exists, return 0 or null.

""" + BILINGUAL_INSTRUCTION + f"""

Metadata (plain strings — do NOT wrap in bilingual):
  citizen_name = "Field Worker", precise_location = "{location}"

All other text fields MUST be bilingual objects: {{\"en\": \"...\", \"hi\": \"...\"}}
Array fields (each element is a bilingual object): expected_resolution_timeline, detailed_resolution_steps, key_complaints

Return ONLY valid JSON:
{{
  "citizen_name": "Field Worker",
  "precise_location": "{location}",
  "executive_summary": {{"en": "", "hi": ""}},
  "primary_category": {{"en": "", "hi": ""}},
  "sub_category": {{"en": "", "hi": ""}},
  "problem_status": {{"en": "", "hi": ""}},
  "urgency_level": {{"en": "", "hi": ""}},
  "duration_of_problem": {{"en": "", "hi": ""}},
  "severity_score": null,
  "severity_reason": {{"en": "", "hi": ""}},
  "population_affected": null,
  "vulnerable_group": {{"en": "", "hi": ""}},
  "vulnerability_flag": {{"en": "", "hi": ""}},
  "expected_resolution_timeline": [{{"en": "", "hi": ""}}],
  "detailed_resolution_steps": [{{"en": "", "hi": ""}}],
  "govt_scheme_applicable": {{"en": "", "hi": ""}},
  "ai_recommended_actions": {{"en": "", "hi": ""}},
  "key_complaints": [{{"en": "", "hi": ""}}],
  "sentiment": {{"en": "", "hi": ""}},
  "description": {{"en": "", "hi": ""}},
  "auto_category": {{"en": "", "hi": ""}}
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

def generate_final_session_report(session_details: dict, feed_items: list, community_inputs: list, media_parts: list = None, text_notes: list = None) -> dict:
    """
    Synthesizes a master NGO report from a multi-item field session in a single multimodal call.
    Takes session metadata, community texts, and an array of RAW audio/image components.
    """
    notes_section = json.dumps(text_notes, indent=2) if text_notes else "[]"
    
    prompt = f"""
You are the Lead Field Auditor for SevaSetu NGO. Your task is to compile a highly professional, factual, and analytical report based directly on the attached raw field evidence (audio recordings, images, and notes).

SESSION METADATA:
{json.dumps(session_details, indent=2)}

WRITTEN NOTES / COMMUNITY TEXT INPUTS:
{notes_section}
{json.dumps(community_inputs, indent=2)}

YOUR TASK:
I have attached the raw audio files and images from this session. Cross-reference what people say in the audio with what you see in the images, and synthesize ALL evidence into a detailed, professional field report.

STRICT CONTENT AUDIT RULES (FAILURE TO FOLLOW REDUCES REPORT USEFULNESS):
1. **IGNORE THE PROCESS**: DO NOT say "Audio input was recorded", "Video captured", "A photo was taken", or "Summary is pending". 
2. **REPORT THE FACTS**: If a voice note says "The well is broken", you MUST write "A broken well was identified as a critical infrastructure failure."
3. **VISUAL DETAIL**: For images/videos, use the 'ai_extraction' field to report on what is VISUALLY happening (e.g. "Volunteers distributing 50 food packets to families").
4. **INTEGRATE COMMUNITY VOICE**: Read the 'community_voice' analysis. If a female aged 30 expressed concern about water, it MUST be listed as a specific finding.
5. **BE SPECIFIC**: Use numbers, locations, and direct observations from the evidence analysis.

""" + BILINGUAL_INSTRUCTION + f"""

STRICT JSON OUTPUT FORMAT (ALL TEXT FIELDS MUST BE BILINGUAL OBJECTS):
{{
  "executive_summary": [
    {{"en": "Bullet point 1: ...", "hi": "Bullet point 1 Hindi: ..."}},
    {{"en": "Bullet point 2: ...", "hi": "Bullet point 2 Hindi: ..."}}
  ],
  "report_type": {{"en": "{session_details.get('type')}", "hi": "Report Type Hindi"}},
  "location_summary": {{"en": "{session_details.get('location')}", "hi": "Location Hindi"}},
  
  "evidence_breakdown": [
    {{
      "evidence_type": {{"en": "Audio / Image / PDF", "hi": "Type Hindi"}},
      "evidence_label": {{"en": "Short label", "hi": "Label Hindi"}},
      "three_line_extraction": [
        {{"en": "Line 1", "hi": "Line 1 Hindi"}},
        {{"en": "Line 2", "hi": "Line 2 Hindi"}},
        {{"en": "Line 3", "hi": "Line 3 Hindi"}}
      ],
      "url": "URL stays as string"
    }}
  ],
  
  "key_findings": [
    {{
      "category": {{"en": "Infrastructure", "hi": "Category Hindi"}},
      "observation": {{"en": "detailed observation", "hi": "Observation Hindi"}}
    }}
  ],
  
  "needs_assessment": [
    {{
      "need": {{"en": "The specific requirement", "hi": "Need Hindi"}},
      "severity": "Low/Moderate/High/Critical (stays as English string for backend logic)",
      "rationale": {{"en": "Directly linked to evidence", "hi": "Rationale Hindi"}}
    }}
  ],
  
  "community_voice": [
    {{
      "member": {{"en": "Member 1 (age, gender)", "hi": "Member 1 Hindi"}},
      "summary": {{"en": "What they expressed", "hi": "Summary Hindi"}},
      "notable_quote": {{"en": "A powerful quote", "hi": "Quote Hindi"}}
    }}
  ],
  
  "evidence_conclusion": [
    {{"en": "Bullet 1: ...", "hi": "Bullet 1 Hindi"}},
    {{"en": "Bullet 2: ...", "hi": "Bullet 2 Hindi"}},
    {{"en": "Bullet 3: ...", "hi": "Bullet 3 Hindi"}}
  ],
  
  "recommended_follow_up": [
    {{"en": "Specific actionable step 1", "hi": "Step 1 Hindi"}},
    {{"en": "Specific actionable step 2", "hi": "Step 2 Hindi"}}
  ],
  
  "metadata": {{
    "duration": "",
    "worker_id": "{session_details.get('workerId')}",
    "timestamp": "{session_details.get('dateTime')}",
    "total_evidence_pieces": {len(feed_items)},
    "community_members_surveyed": {len(community_inputs)}
  }}
}}

Return ONLY valid JSON.
"""
    try:
        print("\n--- [Gemini Final Aggregator] Compiling entire session report (SINGLE MULTIMODAL CALL) ---")
        parts_count = len(media_parts) if media_parts else 0
        print(f"[Gemini Final Aggregator] Sending prompt + {parts_count} raw media components to Gemini 2.5 Flash")
        
        contents = [prompt]
        if media_parts:
            contents.extend(media_parts)

        response = model.generate_content(contents)
        text_content = response.text.strip()
        
        if text_content.startswith("```json"):
            text_content = text_content[7:]
            text_content = text_content.rsplit("```", 1)[0]
        elif text_content.startswith("```"):
            text_content = text_content[3:]
            text_content = text_content.rsplit("```", 1)[0]

        return json.loads(text_content.strip())
    except Exception as e:
        print(f"!!! [Gemini Final Aggregator ERROR] !!!: {e}")
        import traceback
        traceback.print_exc()
        return {"error": "Final synthesis failed.", "details": str(e)}

def verify_task_proof(image_url: str, task_description: str) -> dict:
    """
    Gemini Guard: Verifies if the uploaded image proof matches the task description.
    Returns structured JSON with confidence and analysis.
    """
    prompt = f"""
    You are 'Gemini Guard', an AI verification agent for SevaSetu NGO.
    A volunteer has submitted a photo as proof for the following task:
    TASK: "{task_description}"
    
    YOUR TASK:
    1. Analyze the image to see if it realistically shows the task being completed or the result of the task.
    2. Provide a 'confidence_score' from 0-100.
    3. Identify if the photo is 'irrelevant' (e.g., a selfie, a random object, or a dark/blurry image that shows nothing).
    4. Provide a 'summary' explaining what you see and how it relates to the task.
    
    Return ONLY valid JSON in this structure:
    {{
      "is_verified": true/false,
      "confidence_score": 0-100,
      "is_irrelevant": true/false,
      "summary": "Short 1-2 sentence explanation of findings."
    }}
    """
    
    import requests # type: ignore
    try:
        print(f"\n--- [Gemini Guard] Verifying proof for: {task_description} ---")
        response = requests.get(image_url)
        if response.status_code != 200:
            return {"error": "Could not download image for verification."}
        
        image_bytes = response.content
        file_part = {
            "mime_type": "image/jpeg",
            "data": base64.b64encode(image_bytes).decode("utf-8")
        }

        gemini_response = model.generate_content([prompt, file_part])
        text_content = gemini_response.text.strip()
        
        if text_content.startswith("```json"):
            text_content = text_content[7:]
            text_content = text_content.rsplit("```", 1)[0]
        elif text_content.startswith("```"):
            text_content = text_content[3:]
            text_content = text_content.rsplit("```", 1)[0]

        data = json.loads(text_content.strip())
        print(f"[Gemini Guard] Verification Result: Confidence {data.get('confidence_score')}%")
        return data
    except Exception as e:
        print(f"!!! [Gemini Guard ERROR] !!!: {e}")
        return {
            "is_verified": False,
            "confidence_score": 0,
            "summary": "AI verification failed due to a processing error."
        }


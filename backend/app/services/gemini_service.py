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

def process_document_and_extract(file_bytes: bytes, mime_type: str) -> dict:
    """
    Uses Google Gemini Vision to read a document (Image or PDF) and extract 
    highly structured 20+ parameter fields.
    """
    prompt = """
You are an intelligent social infrastructure surveyor. Analyze the provided document (which could be a handwritten form, a typed report, or an image of an issue) and extract comprehensive structured data.

Extract the following fields. 

CRITICAL INSTRUCTION: Do NOT leave text fields blank or null. If a field is not explicitly mentioned in the document, use your intelligence and the surrounding context to infer, generate, or provide a highly probable and helpful value.

NUMERIC INSTRUCTION: For numeric fields like 'population_affected' or 'demographic_tally', do NOT guess. Only provide a number if there is direct evidence (e.g., tally marks, "50 people", "10 families"). If no direct evidence is found, return 0 or null.

Metadata:
- citizen_name (string): Name of the reporter or citizen
- phone (string): Phone number
- precise_location (string): Where the problem is
- gps_coordinates (string): Any mentioned GPS coords
- demographic_tally (number): Household size or tally marks. Return 0 if not found.

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
- population_affected (number): The number of people affected. DO NOT GUESS. Return 0 or null if not explicitly mentioned or clearly indicated.
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
- description (string): Detailed summary of what was VISUALLY shown in the evidence. Describe setting, people, actions, and specific issues in 3 clear bullet points. Avoid mentioning the fact that it is a photo/file. Focus only on the content.

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
        response = model.generate_content(prompt)
        text_content = response.text.strip()
        
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

Analyze the photo alongside the transcript to generate a highly structured report matching the exact JSON format below.

CRITICAL INSTRUCTION: Do NOT leave text fields blank or null. Use your intelligence and the surrounding context (visual evidence + transcript) to infer, generate, or provide a highly probable and helpful value.

NUMERIC INSTRUCTION: For numeric fields like 'population_affected' or 'severity_score', do NOT guess large numbers. Only provide a number if there is direct evidence in the image or audio. If no direct evidence for population exists, return 0 or null.

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
  "population_affected": null, /* Only if evidence exists, else 0/null */
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

STRICT JSON OUTPUT FORMAT:
{{
  "executive_summary": [
    "Bullet point 1: Specific high-level summary of the EVENT activity (e.g., 'Completed a health drive in Ward 4')",
    "Bullet point 2: Key evidence-based observation (e.g., 'Identified acute water shortage affecting 20 households')",
    "Bullet point 3: Community sentiment and primary request identified",
    "Bullet point 4: Strategic assessment of the mission's impact"
  ],
  "report_type": "{session_details.get('type')}",
  "location_summary": "{session_details.get('location')}",
  
  "evidence_breakdown": [
    {{
      "evidence_type": "Audio / Video / Image / PDF / Note / Community",
      "evidence_label": "Short label (e.g., 'Primary School Condition')",
      "three_line_extraction": [
        "Line 1: Specific content found in the evidence (e.g. 'Classrooms show signs of roof leakage')",
        "Line 2: Data point or detail (e.g. 'Affects approx 30 students during rain')",
        "Line 3: Recommendation (e.g. 'Urgent roof repairs needed before monsoon')"
      ],
      "url": "URL if available"
    }}
  ],
  
  "key_findings": [
    {{
      "category": "e.g. Infrastructure / Health",
      "observation": "detailed observation based on items in feed"
    }}
  ],
  
  "needs_assessment": [
    {{
      "need": "The specific requirement identified",
      "severity": "Low/Moderate/High/Critical",
      "rationale": "Directly linked to the evidence collected"
    }}
  ],
  
  "community_voice": [
    {{
      "member": "Member 1 (age, gender)",
      "summary": "What they specifically expressed or requested",
      "notable_quote": "A powerful quote from their feedback"
    }}
  ],
  
  "evidence_conclusion": [
    "Bullet 1: Direct summary of what the audio evidence (transcripts) specifically revealed about the situation",
    "Bullet 2: Specific description of what visual evidence showed (not just 'was captured')",
    "Bullet 3: Synthesis of community requests",
    "Bullet 4: Overall pattern identified across all media types (e.g. 'Visual and audio evidence both confirm systematic neglect of the public well')",
    "Bullet 5: Final professional assessment for the NGO headquarters"
  ],
  
  "recommended_follow_up": [
    "Specific actionable step 1",
    "Specific actionable step 2"
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


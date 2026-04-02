from google import genai
from google.genai import types
import json
import base64
from app.config.settings import GEMINI_API_KEY

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL_ID = 'gemini-2.5-flash'

REPORT_JSON_SCHEMA = """{
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
    "evidence_insights": {
    "visual_proof": [],
    "documentary_evidence": [],
    "video_evidence": []
  }
}"""

BASE_INSTRUCTIONS = """
You are an intelligent social infrastructure surveyor working for SevaSetu, a community service platform. 

CRITICAL: You may receive images or PDF attachments. Use them to verify claims, add visual evidence details, and describe the physical state of the problem (e.g. rust, leaks, trash, road cracks). Summarize this in "evidence_analysis".

CRITICAL INSTRUCTION: Do NOT leave any fields blank or null. If a field is not explicitly mentioned, use your intelligence and context to infer, generate, or provide a highly probable and helpful value.

Metadata:
- citizen_name: Name of the reporter/citizen (infer from email sender if needed)
- phone: Phone number if mentioned
- precise_location: Where the problem/survey is about
- gps_coordinates: Any GPS coords ("Not provided" if none)
- demographic_tally: Household size or people count

Problem Details:
- executive_summary: Concise 1-sentence summary
- primary_category: ONE of: Water, Sanitation, Infrastructure, Health, Education, Safety, Environment, Community, Other
- sub_category: Specific issue (e.g., Piped Water Supply, Roads)
- problem_status: Active/Persistent, Resolved, or Recurring
- duration_of_problem: E.g., '3 weeks'. Estimate if not mentioned
- urgency_level: Immediate, Critical, Moderate, Low
- service_status: Active or Inactive

Impact & Severity:
- severity_score: 1-10 (10 most severe)
- severity_reason: 2-3 sentence justification
- population_affected: Estimate or exact number
- vulnerable_group: Most affected: women, children, elderly, disabled
- vulnerability_flag: High, Medium, Low
- secondary_impact: Follow-on effects

Action & Follow-up:
- expected_resolution_timeline: Phases list (e.g., ["Phase 1: Verification (3 days)", ...])
- detailed_resolution_steps: 5-7 specific steps
- govt_scheme_applicable: Any relevant Government scheme
- ai_recommended_actions: 2-3 immediate steps with bullet points

Qualitative:
- key_complaints: 3-5 keyword issues
- sentiment: Hopeful, Angry, Desperate, Frustrated, Neutral
- key_quote: Direct quote if applicable
- description: A strictly bulleted list (using '- ') of exactly 4 key observations about the problem failure points, social impact, and technical context. Do NOT include any introductory or summary paragraphs.
- evidence_insights: An object containing THREE lists:
  - visual_proof: A list of 3-5 concise findings from IMAGES.
    Each finding MUST be prefixed with status: [CRITICAL], [RISK], or [CONFIRMED].
    Focus on: physical damage, leaks, environmental conditions, scale of the problem.
  - documentary_evidence: A list of 3-5 concise findings from PDFs/DOCS.
    Each finding MUST be prefixed with status: [OFFICIAL], [TECHNICAL], or [TIMELINE].
    Focus on: stamps, reference numbers, dates, technical specs, formal names.
  - video_evidence: A list of 3-5 concise findings from VIDEOS.
    Each finding MUST be prefixed with status: [ACTION], [ENVIRONMENT], [SOUND], or [MISMATCH].
    Use [MISMATCH] if the video content is irrelevant, accidental, or out of context with the reported issue.
    Focus on: motion/movement, background noise, progression of as issue, or anything that requires "motion" to understand.

MANDATORY: If video bytes are included in the attachments, you MUST analyze them and provide entries in "video_evidence". Do NOT state "No video provided" if bytes were included.
"""

def generate_survey_report(email_body: str, email_subject: str = "", attachments: list = None) -> dict:
    """Generate a structured report from a single email."""
    prompt = f"""{BASE_INSTRUCTIONS}

Analyze this survey/field report email and extract structured data:

EMAIL SUBJECT: "{email_subject}"

EMAIL BODY:
\"\"\"
{email_body}
\"\"\"

Return ONLY valid JSON in this structure:
{REPORT_JSON_SCHEMA}
"""
    return _call_gemini(prompt, attachments)

def generate_collective_report(emails_data: list[dict]) -> dict:
    """Generate a single comprehensive report from multiple related emails."""
    email_sections = []
    all_attachments = []
    for i, email in enumerate(emails_data, 1):
        if email.get("attachments"):
            all_attachments.extend(email["attachments"])
            
        email_sections.append(f"""
--- EMAIL {i} (Date: {email.get('date', 'Unknown')}) ---
FROM: {email.get('from', 'Unknown')}
SUBJECT: {email.get('subject', '')}
BODY:
{email.get('body', '')}
""")

    combined = "\n".join(email_sections)
    prompt = f"""{BASE_INSTRUCTIONS}

You have received {len(emails_data)} related emails about the SAME ISSUE, listed in chronological order (oldest first). These represent a PROGRESS TIMELINE of a community issue.

Analyze ALL emails collectively and produce ONE comprehensive report that:
1. Captures the FULL HISTORY of this issue from start to current state
2. Tracks how the issue has PROGRESSED over time
3. Notes any improvements, deteriorations, or changes
4. Identifies the CURRENT STATUS based on the latest updates
5. Provides recommendations based on the complete picture

EMAILS (in chronological order):
{combined}

ADDITIONAL FIELDS for collective report:
- In the "description" field, include a TIMELINE section showing how the issue evolved
- In "problem_status", reflect the LATEST status
- The "executive_summary" should mention this is based on {len(emails_data)} related communications
- In "ai_recommended_actions", consider the full history

Return ONLY valid JSON in this structure:
{REPORT_JSON_SCHEMA}
"""
    # Collective reports often have many images; we limit to 10 for performance
    report = _call_gemini(prompt, attachments=all_attachments[:10])
    report["is_collective"] = True
    report["email_count"] = len(emails_data)
    return report

def _call_gemini(prompt: str, attachments: list = None) -> dict:
    """Call Gemini API and parse the JSON response."""
    print(f"[AI CALL] Sending request to Gemini ({MODEL_ID})...", flush=True)
    
    parts = [types.Part.from_text(text=prompt)]

    if attachments:
        for att in attachments:
            mime = att.get("mime_type", "")
            data = att.get("data")
            # Send images, PDFs, and common video formats (mp4, webm, mov, etc.)
            is_video = mime.startswith("video/")
            if data and (mime.startswith("image/") or mime == "application/pdf" or is_video):
                print(f"[AI DATA] Attaching {att.get('filename')} ({mime}) - Size: {len(data)} bytes", flush=True)
                parts.append(types.Part.from_bytes(data=data, mime_type=mime))
            else:
                print(f"[AI DATA] Skipping {att.get('filename')} ({mime})", flush=True)

    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=parts,
            config=types.GenerateContentConfig(
                response_mime_type='application/json'
            )
        )
        
        text_content = response.text.strip()
        print(f"[AI CALL] Received response from Gemini. Length: {len(text_content)} characters.", flush=True)
        
        # New SDK supports application/json config, but we keep cleaning logic as a safety net
        if text_content.startswith("```json"):
            text_content = text_content[7:].rsplit("```", 1)[0]
        elif text_content.startswith("```"):
            text_content = text_content[3:].rsplit("```", 1)[0]

        return json.loads(text_content.strip(), strict=False)
    except Exception as e:
        print(f"[AI CALL ERROR] Gemini request failed: {e}", flush=True)
        return {
            "executive_summary": "Error generating report",
            "description": str(e),
            "primary_category": "Other",
            "severity_score": 5,
            "urgency_level": "Moderate",
        }

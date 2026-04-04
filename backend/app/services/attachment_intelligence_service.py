import os
import json
import base64
import google.generativeai as genai # type: ignore
from app.config.firebase_config import db # type: ignore
from firebase_admin import firestore
from app.services.pdf_processor_service import convert_pdf_to_images # type: ignore
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini for Vision Analysis
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

def analyze_attachment_on_upload(file_bytes: bytes, mime_type: str, file_name: str, file_id: str):
    """
    Background Task: Analyzes an attachment using direct bytes during the upload phase.
    Stores the result in Firestore 'attachment_summaries'.
    """
    try:
        print(f"\n--- [Attachment Processing] Starting analysis for: {file_name} ({mime_type}) ---")
        
        # 1. Prepare visual content
        visual_content = []
        
        if "pdf" in mime_type.lower():
            # PDF: Convert to images for best Vision quality
            pages_as_images = convert_pdf_to_images(file_bytes)
            if not pages_as_images:
                raise ValueError("Could not convert PDF to images.")
            
            for img_bytes in pages_as_images:
                visual_content.append({
                    "mime_type": "image/png",
                    "data": base64.b64encode(img_bytes).decode("utf-8")
                })
        elif "image" in mime_type.lower():
            # Image: Use directly
            visual_content.append({
                "mime_type": mime_type,
                "data": base64.b64encode(file_bytes).decode("utf-8")
            })
        else:
            print(f"[Attachment Processing] Skipping non-visual type: {mime_type}")
            return

        # 2. Call Gemini Vision
        prompt = f"""
        You are a strategic NGO Mission Auditor for SevaSetu.
        Analyze this attachment: '{file_name}'.
        
        YOUR TASK:
        1. Identify the document type exactly (e.g., 'Participant List', 'Legal Notice', 'Memo').
        2. Summarize the key data (names, dates, core message, tables) in 3-4 specific sentences.
        3. Explain what the purpose of this file is in a non-profit mission context.

        Return ONLY valid JSON in this exact structure:
        {{
          "file_name": "{file_name}",
          "file_summary": "Extremely detailed summary of extracted content",
          "doc_type": "The identified document type",
          "relevance_score": 1-10,
          "action_recommended": "Specific recommendation for the supervisor"
        }}
        """

        print(f"[Attachment Processing] Calling Gemini Vision for {len(visual_content)} pages/images...")
        
        # Construct content list for Gemini
        # We pass the images + the prompt
        content = visual_content + [prompt]
        
        response = model.generate_content(content)
        text_content = response.text.strip()
        
        # Helper to clean JSON
        if text_content.startswith("```json"):
            text_content = text_content[7:]
            text_content = text_content.rsplit("```", 1)[0]
        elif text_content.startswith("```"):
            text_content = text_content[3:]
            text_content = text_content.rsplit("```", 1)[0]

        analysis = json.loads(text_content.strip())
        
        # 3. Store in Firestore
        # We use a hash of the content or the public_id as the document ID
        # Here we use 'file_id' provided by the caller
        doc_ref = db.collection("attachment_summaries").document(file_id)
        doc_ref.set({
            "analysis": analysis,
            "file_name": file_name,
            "mime_type": mime_type,
            "processed_at": firestore.SERVER_TIMESTAMP,
            "status": "success"
        })
        
        print(f"[Attachment Processing] SUCCESS. Analysis saved to Firestore ID: {file_id}")

    except Exception as e:
        print(f"!!! [Attachment Processing ERROR] {file_name}: {e}")
        # Store error state so Deep Analysis knows it tried
        doc_ref = db.collection("attachment_summaries").document(file_id)
        doc_ref.set({
            "status": "error",
            "error_msg": str(e),
            "file_name": file_name,
            "processed_at": firestore.SERVER_TIMESTAMP
        }, merge=True)

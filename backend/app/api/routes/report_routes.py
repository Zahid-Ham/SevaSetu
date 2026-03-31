from fastapi import APIRouter, HTTPException, UploadFile, File, Form # type: ignore
import tempfile
import os
import uuid
from app.models.report_model import ReportCreate # type: ignore
from app.services.firestore_service import save_report, get_all_reports, delete_report, db # type: ignore
from app.services.whisper_service import transcribe_audio # type: ignore
from app.services.gemini_service import generate_field_report_from_multimedia # type: ignore
from app.services.analysis_service import get_previous_complaints_insights # type: ignore

router = APIRouter()

@router.post("/submit-report")
async def submit_report(report: ReportCreate):
    """
    Endpoint to save a verified report to Firestore.
    """
    try:
        report_dict = report.dict()
        report_id = save_report(report_dict)
        return {
            "success": True,
            "report_id": report_id
        }
    except Exception as e:
        print(f"Error in submit-report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/field-report")
async def create_field_report(
    photo: UploadFile = File(...),
    audio: UploadFile = File(...),
    location: str = Form(...)
):
    """
    Endpoint to synthesize a field report using a photo, voice note, and GPS coordinates.
    """
    try:
        # Save audio temporarily
        temp_audio_path = ""
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            temp_audio_path = temp_audio.name
            
        with open(temp_audio_path, "wb") as f:
            f.write(await audio.read())
            
        # Transcribe audio using Whisper
        transcript = transcribe_audio(temp_audio_path)
        os.remove(temp_audio_path)
        
        # Read photo
        photo_bytes = await photo.read()
        
        # Synthesize with Gemini
        parsed_data = generate_field_report_from_multimedia(photo_bytes, transcript, location)
        
        # Enrich with previous complaints insights
        primary_cat = parsed_data.get("primary_category", "")
        sub_cat = parsed_data.get("sub_category", "")
        insights = get_previous_complaints_insights(primary_cat, sub_cat)
        parsed_data["previous_complaints_insights"] = insights
        
        return {
            "success": True,
            "transcript": transcript,
            "parsed_data": parsed_data
        }
    except Exception as e:
        print(f"Error in field-report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-media")
async def upload_media(file: UploadFile = File(...)):
    """
    Saves a media file to local disk and returns the static URL.
    This acts as a free alternative to Firebase Storage.
    """
    try:
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join("uploads", filename)
        
        with open(filepath, "wb") as f:
            f.write(await file.read())
            
        return {
            "success": True,
            "url": f"/static/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports")
async def get_reports():
    """
    Endpoint to retrieve all submitted community reports from Firestore.
    """
    try:
        reports = get_all_reports()
        return {
            "success": True,
            "reports": reports
        }
    except Exception as e:
        print(f"Error in get-reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reports/{report_id}")
async def delete_report_endpoint(report_id: str):
    """
    Endpoint to delete a specific report from Firestore by its document ID.
    Also removes associated static media (photo/audio) from the local server.
    """
    try:
        doc_ref = db.collection("community_reports").document(report_id)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            photo_url = data.get("photo_url")
            audio_url = data.get("audio_url")
            
            # Delete associated files if they are stored locally on backend
            for url in [photo_url, audio_url]:
                if url and url.startswith("/static/"):
                    filename = url.replace("/static/", "")
                    filepath = os.path.join("uploads", filename)
                    if os.path.exists(filepath):
                        os.remove(filepath)
            
        delete_report(report_id)
        return {"success": True, "message": f"Report {report_id} and associated media deleted successfully."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error in delete-report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

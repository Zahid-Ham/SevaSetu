from fastapi import APIRouter, HTTPException, UploadFile, File, Form # type: ignore
import tempfile
import os
import uuid
from app.models.report_model import ReportCreate # type: ignore
from app.services.firestore_service import save_report, get_all_reports, delete_report, db # type: ignore
from app.services.whisper_service import transcribe_audio # type: ignore
from app.services.gemini_service import generate_field_report_from_multimedia # type: ignore
from app.services.analysis_service import get_previous_complaints_insights # type: ignore
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

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
    Saves a media file to Cloudinary and returns the URL and public_id.
    """
    try:
        file_bytes = await file.read()
        
        # Determine resource type
        resource_type = "auto"
        if file.content_type and file.content_type.startswith("audio/"):
            resource_type = "video" # Audio is handled under 'video' resource type in Cloudinary

        result = cloudinary.uploader.upload(
            file_bytes,
            resource_type=resource_type,
            folder="sevasetu/survey",
            use_filename=True,
            unique_filename=True,
            overwrite=False,
            filename_override=file.filename,
        )
        
        return {
            "success": True,
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "resource_type": result["resource_type"],
            "format": result.get("format", ""),
            "bytes": result.get("bytes", 0),
            "version": str(result.get("version", ""))
        }
    except Exception as e:
        print(f"[upload-media] Error: {e}")
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
            photo_public_id = data.get("photo_public_id")
            audio_public_id = data.get("audio_public_id")
            
            # Delete local files if legacy
            for url in [photo_url, audio_url]:
                if url and isinstance(url, str) and url.startswith("/static/"):
                    filename = url.replace("/static/", "")
                    filepath = os.path.join("uploads", filename)
                    if os.path.exists(filepath):
                        os.remove(filepath)
            
            # Delete Cloudinary assets
            for pid in [photo_public_id, audio_public_id]:
                if pid:
                    try:
                        # AUDIO is now uploaded as 'video' resource_type in Cloudinary
                        is_audio = pid == audio_public_id
                        rtype = "video" if is_audio else "image"
                        
                        # Try deletion
                        res = cloudinary.uploader.destroy(pid, resource_type=rtype)
                        
                        # If first attempt fails and it's audio, it might be 'raw' (legacy)
                        if res.get("result") != "ok" and is_audio:
                            cloudinary.uploader.destroy(pid, resource_type="raw")
                            
                        print(f"[delete_report] Destroyed Cloudinary asset: {pid} (type: {rtype})")
                    except Exception as ce:
                        print(f"[delete_report] Failed to destroy Cloudinary asset {pid}: {ce}")
            
        delete_report(report_id)
        return {"success": True, "message": f"Report {report_id} and associated media deleted successfully."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error in delete-report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body # type: ignore
import tempfile
import os
import uuid
import json
from typing import List, Optional
from app.models.report_model import ReportCreate # type: ignore
from app.services.firestore_service import save_report, get_all_reports, delete_report, db # type: ignore
from app.services.whisper_service import transcribe_audio # type: ignore
from app.services.google_stt_service import transcribe_audio_file_google # type: ignore
from app.services.video_service import extract_audio_from_video, cleanup_file # type: ignore
from app.services.gemini_service import (
    generate_field_report_from_multimedia, 
    generate_final_session_report,
    process_document_and_extract
) # type: ignore
from app.services.certificate_service import check_and_award_badges, check_and_issue_certificates # type: ignore
from app.services.analysis_service import get_previous_complaints_insights # type: ignore
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
import asyncio
from fastapi import BackgroundTasks # type: ignore

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
async def submit_report(report: ReportCreate, background_tasks: BackgroundTasks):
    """
    Endpoint to save a verified report to Firestore.
    """
    try:
        report_dict = report.dict()
        report_id = save_report(report_dict)
        
        # --- Recognition Trigger ---
        v_id = report_dict.get("volunteer_id")
        if v_id and v_id != 'unknown':
            print(f"[SUBMIT-REPORT] Triggering eligibility check for volunteer: {v_id}")
            background_tasks.add_task(check_and_award_badges, v_id)
            background_tasks.add_task(check_and_issue_certificates, v_id)
            
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

@router.post("/field-report/process-item")
async def process_field_item(
    file: Optional[UploadFile] = File(None),
    note: Optional[str] = Form(None),
    type: str = Form(...)
):
    """
    Capture-time: Upload to Cloudinary only. No AI analysis.
    Gemini runs later at /finalize (Generate Report).
    """
    try:
        result = {"success": True, "type": type, "summary": "", "url": "", "public_id": ""}

        if type == "note":
            result["summary"] = note or ""
            return result

        if not file:
            raise HTTPException(status_code=400, detail="File is required for this type")

        file_bytes = await file.read()
        fname = file.filename or f"field_{type}"
        print(f"[process-item] Uploading {type}: {fname} ({len(file_bytes)} bytes)")

        resource_type = "video" if type in ["audio", "video"] else "auto"
        try:
            upload_res = cloudinary.uploader.upload(
                file_bytes,
                resource_type=resource_type,
                folder="sevasetu/field_notes",
                use_filename=True,
            )
            result["url"] = upload_res["secure_url"]
            result["public_id"] = upload_res["public_id"]
            print(f"[process-item] (OK) Cloudinary done: {result['url'][:70]}...")
        except Exception as ue:
            print(f"[process-item] (WARN) Cloudinary failed: {ue}")

        # Simple label shown in live feed — Gemini will enrich this at report time
        labels = {"audio": "🎤 Voice note uploaded", "image": "📸 Photo uploaded", "video": "🎥 Video uploaded", "pdf": "📄 Document uploaded"}
        result["summary"] = labels.get(type, f"{type.capitalize()} uploaded")

        return result

    except Exception as e:
        print(f"[process-field-item] Error: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/field-report/finalize")
async def finalize_field_report(
    background_tasks: BackgroundTasks,
    session_details: str = Form(...),
    feed_items: str = Form(...),
    community_inputs: str = Form(...),
    files: Optional[List[UploadFile]] = File(None)
):
    """
    Full pipeline:
    1. Receive all session data + raw media files
    2. Upload each file to Cloudinary
    3. AI-analyze each evidence piece (transcribe audio, analyze images, etc.)
    4. Generate per-evidence 3-liner conclusions
    5. Synthesize final report via Gemini
    """
    try:
        details = json.loads(session_details)
        items = json.loads(feed_items)
        inputs = json.loads(community_inputs)

        print(f"\n{'='*60}")
        print(f"[FINALIZE] Starting report generation pipeline")
        print(f"[FINALIZE] Feed items: {len(items)}, Community inputs: {len(inputs)}, Files: {len(files) if files else 0}")
        print(f"{'='*60}")

        # --- Phase 1: Prepare everything for a single batch AI call ---
        async def process_evidence(item_data, upload_file=None):
            import requests as req_lib
            import base64
            import google.generativeai as genai
            
            file_type = item_data.get("type", "unknown")
            fname = upload_file.filename if upload_file else (item_data.get("filename") or "field_note")
            cloud_url = item_data.get("url", "")
            note_text = item_data.get("summary", "") or item_data.get("content", "")

            result = {
                "evidence": {
                    "type": file_type, 
                    "filename": fname, 
                    "url": cloud_url, 
                    "ai_extraction": "Visual/Audio analyzed by unified master model" if file_type != "video" else "Video evidence attached"
                },
                "media_part": None,
                "text_note": f"[{file_type.upper()}] {note_text}" if note_text else None
            }

            if file_type == "video":
                result["text_note"] = f"[VIDEO EVIDENCE] A video was recorded for this event. View it here: {cloud_url}"
                return result
                
            if file_type == "note":
                return result

            # --- Get file bytes ---
            file_bytes = None
            if upload_file:
                file_bytes = await upload_file.read()
            elif cloud_url:
                try:
                    resp = req_lib.get(cloud_url, timeout=30)
                    if resp.status_code == 200:
                        file_bytes = resp.content
                except Exception as de:
                    print(f"[FINALIZE] (WARN) Download error for {fname}: {de}")

            if not file_bytes:
                return result

            # --- Upload to Cloudinary if not already there ---
            if not cloud_url and upload_file:
                try:
                    resource_type = "video" if file_type == "audio" else "auto"
                    upload_res = cloudinary.uploader.upload(
                        file_bytes, resource_type=resource_type,
                        folder="sevasetu/field_notes", use_filename=True,
                    )
                    result["evidence"]["url"] = upload_res["secure_url"]
                except Exception as ue:
                    print(f"[FINALIZE] (WARN) Cloudinary upload failed: {ue}")

            # --- Prepare Media for Gemini ---
            temp_path = ""
            ext = fname.split(".")[-1] if "." in fname else ("mp3" if file_type == "audio" else "jpg")
            try:
                if file_type == "audio":
                    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
                        tmp.write(file_bytes)
                        temp_path = tmp.name
                    print(f"[FINALIZE] Uploading audio to Gemini: {fname}")
                    audio_file = genai.upload_file(path=temp_path)
                    import time
                    while audio_file.state.name == "PROCESSING":
                        time.sleep(1)
                        audio_file = genai.get_file(audio_file.name)
                    if audio_file.state.name == "ACTIVE":
                        result["media_part"] = audio_file
                elif file_type == "image":
                    print(f"[FINALIZE] Encoding image for Gemini: {fname}")
                    result["media_part"] = {"mime_type": "image/jpeg", "data": base64.b64encode(file_bytes).decode("utf-8")}
                elif file_type == "pdf":
                    print(f"[FINALIZE] Encoding PDF for Gemini: {fname}")
                    result["media_part"] = {"mime_type": "application/pdf", "data": base64.b64encode(file_bytes).decode("utf-8")}
            except Exception as e:
                print(f"[FINALIZE] Gemini preparation failed for {fname}: {e}")
            finally:
                if temp_path: cleanup_file(temp_path)

            return result

        # Build tasks
        tasks = []

        if files:
            for f in files:
                fname_lower = f.filename.lower()
                if "community_audio" in fname_lower:
                    tasks.append(process_evidence({"type": "audio", "url": ""}, f))
                elif "community_photo" in fname_lower:
                    tasks.append(process_evidence({"type": "image", "url": ""}, f))
                else:
                    item_meta = next((i for i in items if i.get("localUri") == "has_file"), {})
                    tasks.append(process_evidence(item_meta, f))

        for item in items:
            tasks.append(process_evidence(item))

        raw_results = list(await asyncio.gather(*tasks))

        # Separate items
        evidence_metadata = []
        media_parts = []
        text_notes = []

        for r in raw_results:
            evidence_metadata.append(r["evidence"])
            if r["media_part"]:
                media_parts.append(r["media_part"])
            if r["text_note"]:
                text_notes.append(r["text_note"])

        # Community text inputs
        for ci in inputs:
            if ci.get("media", {}).get("inputText"):
                text_notes.append(f"Community Feedback ({ci.get('age')}, {ci.get('gender')}): {ci['media']['inputText']}")

        print(f"\n[FINALIZE] Data assembled: {len(media_parts)} raw media parts, {len(text_notes)} text notes.")
        
        try:
            # --- Phase 2: Generate the final report with single batch Gemini call ---
            report = generate_final_session_report(details, items, inputs, media_parts=media_parts, text_notes=text_notes)
        finally:
            import google.generativeai as genai
            for p in media_parts:
                if hasattr(p, 'name'):
                    try:
                        genai.delete_file(p.name)
                        print(f"[FINALIZE] Cleaned up Gemini storage file: {p.name}")
                    except:
                        pass

        # Inject media library
        report["media_library"] = [
            {
                "type": e["type"],
                "url": e["url"],
                "ai_summary": e["ai_extraction"][:200] if e["ai_extraction"] else "",
            }
            for e in evidence_metadata if e.get("url")
        ]
        
        # --- Phase 3: Save to Firestore so it appears in Recent Scans ---
        try:
            firestore_record = {
                "volunteer_id": details.get("workerId", "unknown"),
                "citizen_name": details.get("workerName", "Field Worker"),
                "precise_location": details.get("location", ""),
                "gps_coordinates": details.get("location", ""),
                "executive_summary": report.get("executive_summary", ""),
                "primary_category": report.get("report_type", "Field Report"),
                "auto_category": report.get("report_type", "Field Report"),
                "report_source": "field_report",
                "urgency_level": "Moderate",
                "description": report.get("evidence_conclusion", ""),
                "severity_score": None,
                "field_report_data": json.dumps(report),  # Store full report for later viewing
            }
            
            # Set severity from needs_assessment
            needs = report.get("needs_assessment", [])
            if needs:
                severities = {"Critical": 9, "High": 7, "Moderate": 5, "Low": 3}
                max_sev = max(severities.get(n.get("severity", "Low"), 3) for n in needs)
                firestore_record["severity_score"] = max_sev
                firestore_record["urgency_level"] = next(
                    (n.get("severity") for n in needs if severities.get(n.get("severity", ""), 0) == max_sev), 
                    "Moderate"
                )
            
            report_id = save_report(firestore_record)
            print(f"[FINALIZE] (OK) Saved to Firestore as: {report_id}")
            
            # --- Phase 4: Recognition ---
            v_id = details.get("workerId")
            if v_id:
                print(f"[FINALIZE] Triggering eligibility check for volunteer: {v_id}")
                background_tasks.add_task(check_and_award_badges, v_id)
                background_tasks.add_task(check_and_issue_certificates, v_id)
        except Exception as fs_err:
            print(f"[FINALIZE] (WARN) Firestore save failed (non-fatal): {fs_err}")
            report_id = None
        
        return {
            "success": True,
            "report": report,
            "report_id": report_id
        }
    except Exception as e:
        print(f"[finalize-field-report] Error: {e}")
        import traceback
        traceback.print_exc()
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
async def get_reports(citizen_id: Optional[str] = None, phone: Optional[str] = None):
    """
    Endpoint to retrieve community reports, optionally filtered by citizen_id or phone.
    """
    try:
        all_reports = get_all_reports()
        
        if citizen_id:
            filtered = [r for r in all_reports if r.get("citizen_id") == citizen_id]
            return {"success": True, "reports": filtered}
            
        if phone:
            filtered = [r for r in all_reports if r.get("phone") == phone]
            return {"success": True, "reports": filtered}

        return {
            "success": True,
            "reports": all_reports
        }
    except Exception as e:
        print(f"Error in get-reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reports/{report_id}/resolve")
async def resolve_report(report_id: str):
    """
    Marks a report as resolved and sets the resolved_at timestamp.
    """
    try:
        from datetime import datetime
        update_data = {
            "status": "Resolved",
            "resolved_at": datetime.utcnow().isoformat()
        }
        db.collection("community_reports").document(report_id).update(update_data)
        return {"success": True, "message": "Report marked as resolved"}
    except Exception as e:
        print(f"Error resolving report: {e}")
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

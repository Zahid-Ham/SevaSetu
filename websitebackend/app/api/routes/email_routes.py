from fastapi import APIRouter, HTTPException, Header, Query  # type: ignore
from pydantic import BaseModel  # type: ignore
import requests # type: ignore
from app.services.auth_service import get_access_token_from_header
from app.services.gmail_service import list_survey_emails, get_email_full_content, get_multiple_emails_content
from app.services.gemini_service import (
    generate_survey_report, 
    generate_collective_report, 
    generate_embedding, 
    get_report_context_string
)
from app.services.firebase_service import save_report, get_user_settings, save_user_settings, get_report_by_id
from app.services.cloudinary_service import upload_attachment as cloud_uploader

router = APIRouter(prefix="/emails", tags=["Email Scanner"])


class ReportRequest(BaseModel):
    email_id: str
    user_email: str


class CollectiveReportRequest(BaseModel):
    email_ids: list[str]
    user_email: str
    group_label: str = ""


class SettingsRequest(BaseModel):
    user_email: str
    allowed_senders: list[str] = []


@router.get("/scan")
async def scan_survey_emails(
    user_email: str = Query(None),
    last_scan_time: int = Query(None),
    authorization: str = Header(None),
):
    """
    Scans the user's Gmail for the past 2-7 days or since last_scan_time.
    """
    access_token = get_access_token_from_header(authorization)
    if not access_token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    allowed_senders = []
    if user_email:
        settings = get_user_settings(user_email)
        allowed_senders = settings.get("allowed_senders", [])

    try:
        result = list_survey_emails(
            access_token, 
            user_email=user_email, 
            allowed_senders=allowed_senders,
            last_scan_time=last_scan_time
        )
        return result
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Google access token expired or invalid")
        print(f"Email scan error (HTTP): {e}")
        raise HTTPException(status_code=500, detail=f"Failed to scan emails: {str(e)}")
    except Exception as e:
        print(f"Email scan error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to scan emails: {str(e)}")


@router.post("/report")
async def generate_single_report(request: ReportRequest, authorization: str = Header(None)):
    """Generate a report from a single email."""
    access_token = get_access_token_from_header(authorization)
    if not access_token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    try:
        print(f"[REPORT START] Generating single report for email {request.email_id}...", flush=True)
        email_content = get_email_full_content(access_token, request.email_id)
        if not email_content:
            raise HTTPException(status_code=404, detail="Email not found")

        # 1. Upload Attachments to Storage
        attachments = email_content.get("attachments", [])
        stored_attachments = []
        for att in attachments:
            try:
                public_url = cloud_uploader(att["data"], att["filename"], att["mime_type"])
                stored_attachments.append({
                    "filename": att["filename"],
                    "url": public_url,
                    "mime_type": att["mime_type"]
                })
            except Exception as e:
                print(f"Failed to upload attachment {att['filename']}: {e}")

        # 2. Generate AI Report
        report = generate_survey_report(
            email_body=email_content["body"],
            email_subject=email_content["subject"],
            attachments=attachments, # Pass raw bytes to Gemini
        )
        
        # 3. Add stored URLs to report
        report["attachments"] = stored_attachments

        # 4. Generate Embedding for Memory
        context_str = get_report_context_string(report)
        embedding = generate_embedding(context_str)

        # 5. Save to Firestore
        report_id = save_report(
            user_email=request.user_email,
            report_data=report,
            email_subject=email_content["subject"],
            embedding=embedding
        )
        report["id"] = report_id

        print(f"[REPORT FINISH] Report {report_id} generated successfully.", flush=True)
        return {"report": report, "message": "Report generated successfully"}
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Google access token expired or invalid")
        print(f"[REPORT ERROR] Request failed (HTTP): {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[REPORT ERROR] Request failed: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.post("/collective-report")
async def generate_group_report(request: CollectiveReportRequest, authorization: str = Header(None)):
    """
    Generate a single comprehensive report from multiple related emails.
    These are emails about the same issue, analyzed collectively.
    """
    access_token = get_access_token_from_header(authorization)
    if not access_token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    try:
        # Fetch all email contents
        emails_data = get_multiple_emails_content(access_token, request.email_ids)
        if not emails_data:
            raise HTTPException(status_code=404, detail="No emails found")

        # 1. Gather and Upload ALL attachments from the group
        stored_attachments = []
        all_raw_attachments = []
        for email in emails_data:
            for att in email.get("attachments", []):
                all_raw_attachments.append(att)
                try:
                    public_url = cloud_uploader(att["data"], att["filename"], att["mime_type"])
                    stored_attachments.append({
                        "filename": att["filename"],
                        "url": public_url,
                        "mime_type": att["mime_type"]
                    })
                except Exception as e:
                    print(f"Failed to upload collective attachment {att['filename']}: {e}")

        # 2. Generate Collective AI Report
        report = generate_collective_report(emails_data)
        
        # 3. Add stored URLs to report
        report["attachments"] = stored_attachments

        # 4. Generate Embedding for Memory
        context_str = get_report_context_string(report)
        embedding = generate_embedding(context_str)

        # 5. Save to Firestore
        report_id = save_report(
            user_email=request.user_email,
            report_data=report,
            email_subject=f"[Collective] {request.group_label} ({len(request.email_ids)} emails)",
            embedding=embedding
        )
        report["id"] = report_id

        return {"report": report, "message": f"Collective report generated from {len(request.email_ids)} emails"}
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Google access token expired or invalid")
        print(f"Collective report error (HTTP): {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate collective report: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Collective report error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate collective report: {str(e)}")


@router.get("/settings")
async def get_settings(user_email: str = Query(...)):
    """Get user's email scanner settings."""
    try:
        settings = get_user_settings(user_email)
        return {"settings": settings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings")
async def update_settings(request: SettingsRequest):
    """Update user's allowed senders whitelist."""
    try:
        save_user_settings(request.user_email, {"allowed_senders": request.allowed_senders})
        return {"message": "Settings saved", "allowed_senders": request.allowed_senders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/report/{report_id}")
async def get_single_report(report_id: str):
    """Fetch a single report by ID."""
    try:
        report = get_report_by_id(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, UploadFile, File, HTTPException # type: ignore
from typing import List
import asyncio
import traceback
from app.services.gemini_service import process_document_and_extract # type: ignore
from app.services.analysis_service import get_previous_complaints_insights # type: ignore
import cloudinary
import cloudinary.uploader
import os
import uuid
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

@router.post("/scan-form")
async def scan_form(file: UploadFile = File(...)):
    """
    Endpoint to scan a document (Image or PDF) and extract 20+ structured fields using Gemini.
    """
    if not file.content_type or (not file.content_type.startswith("image/") and file.content_type != "application/pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image or PDF.")

    try:
        # Read file bytes
        image_bytes = await file.read()
        
        # Use Gemini Vision natively on images or PDFs
        result = process_document_and_extract(image_bytes, mime_type=file.content_type)
        
        # Enrich with previous complaints insights
        primary_cat = result.get("primary_category", "")
        sub_cat = result.get("sub_category", "")
        insights = get_previous_complaints_insights(primary_cat, sub_cat)
        result["previous_complaints_insights"] = insights

        raw_text = result.get("description", "No description available")

        # Upload to Cloudinary
        resource_type = "auto"
        if file.content_type == "application/pdf":
            resource_type = "raw"
            
        c_result = cloudinary.uploader.upload(
            image_bytes,
            resource_type=resource_type,
            folder="sevasetu/survey",
            use_filename=True,
            unique_filename=True,
            overwrite=False,
            filename_override=file.filename,
        )

        return {
            "success": True,
            "raw_text": raw_text,
            "parsed_data": result,
            "url": c_result["secure_url"],
            "public_id": c_result["public_id"]
        }
    except Exception as e:
        import traceback
        print(f"[scan-form] Error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-scan")
async def batch_scan_forms(files: List[UploadFile] = File(...)):
    """
    Endpoint to process multiple documents in parallel using Gemini and upload to Cloudinary.
    """
    async def process_single_file(file: UploadFile):
        if not file.content_type or (not file.content_type.startswith("image/") and file.content_type != "application/pdf"):
            return {"filename": file.filename, "error": "Invalid file type. Please upload an image or PDF."}
        
        try:
            image_bytes = await file.read()
            # Process with Gemini
            result = process_document_and_extract(image_bytes, mime_type=file.content_type)
            raw_text = result.pop("description", "No description available")
            
            # Use signed Cloudinary upload
            resource_type = "auto"
            if file.content_type == "application/pdf":
                resource_type = "raw"
                
            c_result = cloudinary.uploader.upload(
                image_bytes,
                resource_type=resource_type,
                folder="sevasetu/survey",
                use_filename=True,
                unique_filename=True,
                overwrite=False,
                filename_override=file.filename,
            )

            return {
                "filename": file.filename,
                "success": True,
                "raw_text": raw_text,
                "parsed_data": result,
                "url": c_result["secure_url"],
                "public_id": c_result["public_id"]
            }
        except Exception as e:
            return {"filename": file.filename, "error": str(e)}

    results = await asyncio.gather(*(process_single_file(f) for f in files))
    return {"success": True, "results": results}

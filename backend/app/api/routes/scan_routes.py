from fastapi import APIRouter, UploadFile, File, HTTPException  # type: ignore
from typing import List
import asyncio
from app.services.gemini_service import process_document_and_extract  # type: ignore

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
        
        # Save file to uploads for persistence
        import uuid
        import os
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join("uploads", filename)
        
        with open(filepath, "wb") as f:
            f.write(image_bytes)
            
        print(f"[scan-form] Saved file: {filename}, size: {len(image_bytes)} bytes") # type: ignore

        # Use Gemini Vision natively on images or PDFs
        result = process_document_and_extract(image_bytes, mime_type=file.content_type)

        raw_text = result.pop("description", "No description available")

        return {
            "success": True,
            "raw_text": raw_text,
            "parsed_data": result,
            "url": f"/static/{filename}"
        }
    except Exception as e:
        import traceback
        print(f"[scan-form] Error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-scan")
async def batch_scan_forms(files: List[UploadFile] = File(...)):
    """
    Endpoint to process multiple documents in parallel using Gemini.
    """
    async def process_single_file(file: UploadFile):
        if not file.content_type or (not file.content_type.startswith("image/") and file.content_type != "application/pdf"):
            return {"filename": file.filename, "error": "Invalid file type. Please upload an image or PDF."}
        
        try:
            image_bytes = await file.read()
            result = process_document_and_extract(image_bytes, mime_type=file.content_type)
            raw_text = result.pop("description", "No description available")
            return {
                "filename": file.filename,
                "success": True,
                "raw_text": raw_text,
                "parsed_data": result
            }
        except Exception as e:
            return {"filename": file.filename, "error": str(e)}

    results = await asyncio.gather(*(process_single_file(f) for f in files))
    return {"success": True, "results": results}

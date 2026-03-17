from fastapi import APIRouter, UploadFile, File, HTTPException  # type: ignore
from app.services.gemini_service import process_image_and_extract  # type: ignore

router = APIRouter()

@router.post("/scan-form")
async def scan_form(file: UploadFile = File(...)):
    """
    Endpoint to scan a form image and extract structured fields using Gemini Vision.
    No Google Document AI required — image is processed directly by Gemini.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        # Read file bytes
        image_bytes = await file.read()
        print(f"[scan-form] Received image: {file.filename}, size: {len(image_bytes)} bytes, type: {file.content_type}")

        # Use Gemini Vision directly (no Document AI)
        result = process_image_and_extract(image_bytes, mime_type=file.content_type)

        raw_text = result.pop("raw_text", "")

        return {
            "success": True,
            "raw_text": raw_text,
            "parsed_data": result
        }
    except Exception as e:
        import traceback
        print(f"[scan-form] Error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

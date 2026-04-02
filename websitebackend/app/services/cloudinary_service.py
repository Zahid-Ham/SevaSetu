import cloudinary
import cloudinary.uploader
import os
from app.config.settings import CLOUDINARY_URL

# Universal Cloudinary configuration
# CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
if CLOUDINARY_URL:
    cloudinary.config(cloudinary_url=CLOUDINARY_URL)

def upload_attachment(file_bytes: bytes, filename: str, mime_type: str) -> str:
    """
    Uploads a file (Image, PDF, or Doc) to Cloudinary and returns the secure URL.
    Uses resource_type='auto' to detect and handle all formats.
    """
    if not CLOUDINARY_URL:
        print("Warning: CLOUDINARY_URL not set. Skipping upload.")
        return ""

    try:
        # Use filename as a prefix but let Cloudinary add a unique hash to prevent collisions
        safe_filename = "".join([c if c.isalnum() else "_" for c in filename.split(".")[0]])
        
        # Strategy change: using 'auto' to automatically detect images, videos, and raw files.
        # This gives us best-in-class processing and thumbnails for videos while keeping PDFs compatible.
        res_type = "auto" 

        # Unique ID with timestamp to prevent cache issues
        from datetime import datetime
        timestamp = int(datetime.utcnow().timestamp())
        final_public_id = f"{safe_filename}_{timestamp}"

        print(f"[CLOUDINARY] Uploading {filename} as {res_type}...", flush=True)

        response = cloudinary.uploader.upload(
            file_bytes,
            folder="sevasetu/attachments",
            public_id=final_public_id,
            resource_type=res_type,
            access_mode="public",
            type="upload", # Force public upload type
            overwrite=True,
            invalidate=True
        )
        
        # DEBUG PRINT: Crucial to see if Cloudinary actually saved it as public
        print(f"[CLOUDINARY] Response: {response}", flush=True)
        
        return response.get("secure_url", "")
    except Exception as e:
        print(f"Error uploading to Cloudinary: {e}")
        return ""

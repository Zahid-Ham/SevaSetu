import os
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

def upload_telegram_media_to_cloudinary(file_bytes, filename: str, resource_type: str = "auto"):
    """
    Uploads media (photo, video, audio, or document) from Telegram to Cloudinary.
    resource_type can be 'image', 'video', 'raw' (for docs/pdfs), or 'auto'.
    """
    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            resource_type=resource_type,
            folder="sevasetu/bot_reports",
            use_filename=True,
            unique_filename=True,
            overwrite=False,
            filename_override=filename,
        )
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "resource_type": result["resource_type"]
        }
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return None

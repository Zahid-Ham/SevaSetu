import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "credentials/firebase-credentials.json")
PROJECT_ID = os.getenv("PROJECT_ID", "bank-a1d2a")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
FIREBASE_STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET", "bank-a1d2a.firebasestorage.app")
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL")

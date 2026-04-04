import sys
import os
from dotenv import load_dotenv

# Set project root and backend dir
PROJECT_ROOT = r"c:\Users\ZAHID\Desktop\SevaSetu"
BACKEND_DIR = os.path.join(PROJECT_ROOT, 'backend')

# Load .env from backend
load_dotenv(os.path.join(BACKEND_DIR, '.env'))

# Set absolute path for credentials
os.environ["FIREBASE_CREDENTIALS_PATH"] = os.path.join(BACKEND_DIR, 'credentials', 'firebase-credentials.json')

# Add backend to path so we can import app modules
sys.path.append(BACKEND_DIR)

from app.config.firebase_config import db

def cleanup_zahid_requests():
    print("Searching for requests for zahid_khan_001...")
    requests_ref = db.collection("volunteer_requests")
    docs = requests_ref.where("citizen_id", "==", "zahid_khan_001").stream()
    
    count = 0
    for doc in docs:
        print(f"Deleting request: {doc.id}")
        doc.reference.delete()
        count += 1
    
    print(f"Successfully deleted {count} requests.")

if __name__ == "__main__":
    cleanup_zahid_requests()

import firebase_admin  # type: ignore
from firebase_admin import credentials, firestore  # type: ignore
import os
from dotenv import load_dotenv  # type: ignore

# Load environment variables
load_dotenv()

def initialize_firebase():
    """
    Initializes Firebase Admin SDK and returns the Firestore client.
    Ensures initialization only runs once.
    """
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        
        if cred_path and os.path.exists(cred_path):
            print(f"Initializing Firebase with certificate: {cred_path}")
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            print("FIREBASE_CREDENTIALS_PATH not set or file not found. Falling back to Google Application Default Credentials.")
            firebase_admin.initialize_app()
            
        print("Firebase Admin SDK initialized successfully.")
    
    return firestore.client()

# Expose the Firestore client
db = initialize_firebase()

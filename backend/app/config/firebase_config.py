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
        if not cred_path:
            raise ValueError("FIREBASE_CREDENTIALS_PATH not found in environment variables")
        
        # Ensure path is absolute if it's relative to backend root
        if not os.path.isabs(cred_path):
            # Assuming the command is run from 'backend' directory or project root
            # If run from 'backend', 'credentials/...' works.
            # If run from root, 'backend/credentials/...' works.
            # Let's try to find it relative to this file's directory if needed, 
            # but usually the Cwd is set correctly.
            pass

        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
    
    return firestore.client()

# Expose the Firestore client
db = initialize_firebase()

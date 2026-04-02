import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

load_dotenv()

FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "credentials/firebase-credentials.json")

if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def check_reports():
    print("Checking 'survey_reports' collection...")
    docs = db.collection("survey_reports").stream()
    count = 0
    for doc in docs:
        data = doc.to_dict()
        print(f"ID: {doc.id}, Email: {data.get('user_email')}")
        count += 1
    print(f"Total reports: {count}")

if __name__ == "__main__":
    check_reports()

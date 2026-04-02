import firebase_admin
from firebase_admin import credentials, firestore
import os

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate('credentials/firebase-credentials.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

def check_all_settings():
    docs = db.collection('user_settings').stream()
    for doc in docs:
        print(f"User: {doc.id}")
        print(f"  Allowed Senders: {doc.to_dict().get('allowed_senders', [])}")

if __name__ == "__main__":
    check_all_settings()

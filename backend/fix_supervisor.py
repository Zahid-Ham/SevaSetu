
import firebase_admin
from firebase_admin import credentials, firestore
import os

def fix_supervisor():
    if not firebase_admin._apps:
        cred_path = r"c:\Users\ZAHID\Downloads\SevaSetuversion1\SevaSetuversion1\SevaSetu\backend\credentials\firebase-credentials.json"
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
            
    db = firestore.client()
    sup_email = "23102043@apsit.edu.in"
    sup_docs = db.collection("users").where("email", "==", sup_email).stream()
    
    for doc in sup_docs:
        print(f"Fixing Supervisor Profile: {doc.id}")
        doc.reference.update({
            "role": "SUPERVISOR",
            "ngo_id": "ngo_helping_hands",
            "ngo_name": "Helping Hands"
        })
        print("Profile updated successfully!")

if __name__ == "__main__":
    fix_supervisor()


import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

def run_diag():
    if not firebase_admin._apps:
        cred_path = r"c:\Users\ZAHID\Downloads\SevaSetuversion1\SevaSetuversion1\SevaSetu\backend\credentials\firebase-credentials.json"
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
            
    db = firestore.client()
    users_ref = db.collection("users")
    
    print("\n--- DIAGNOSTIC: SUPERVISOR ---")
    sup_email = "23102043@apsit.edu.in"
    sup_docs = users_ref.where("email", "==", sup_email).stream()
    ngo_id = None
    for doc in sup_docs:
        data = doc.to_dict()
        ngo_id = data.get('ngo_id')
        print(f"Supervisor ID: {doc.id}")
        print(f"NGO ID: {ngo_id}")
        print(f"Role: {data.get('role')}")
    
    print("\n--- DIAGNOSTIC: VOLUNTEERS FOR THIS NGO ---")
    if ngo_id:
        docs = users_ref.where("ngo_id", "==", ngo_id).where("role", "==", "VOLUNTEER").stream()
        count = 0
        for doc in docs:
            count += 1
            data = doc.to_dict()
            print(f"Volunteer ID: {doc.id}")
            print(f"Name Field: {data.get('name')}")
            print(f"FullName Field: {data.get('fullName')}")
            print(f"CitizenName Field: {data.get('citizen_name')}")
            print("-" * 20)
        print(f"Total volunteers found: {count}")
    else:
        print("No NGO ID found for supervisor!")

if __name__ == "__main__":
    run_diag()

import firebase_admin
from firebase_admin import credentials, firestore
import os

# Path to your firebase credentials
cred_path = os.path.join(os.path.dirname(__file__), "credentials", "firebase-credentials.json")
cred = credentials.Certificate(cred_path)

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

MOCK_USERS = [
    { "id": 'cit_001', "name": 'Zahid Khan', "email": 'zahid@example.com', "role": 'CITIZEN' },
    { "id": 'cit_002', "name": 'Priya Sharma', "email": 'priya@example.com', "role": 'CITIZEN' },
    { "id": 'cit_003', "name": 'Ajay Verma', "email": 'ajay@example.com', "role": 'CITIZEN' },
    { "id": 'cit_004', "name": 'Sneha Reddy', "email": 'sneha@example.com', "role": 'CITIZEN' },
    { "id": 'cit_005', "name": 'Rohan Malhotra', "email": 'rohan@example.com', "role": 'CITIZEN' },
    { "id": 'vol_rahul_01', "name": 'Rahul Gupta', "email": 'rahul@volunteer.com', "role": 'VOLUNTEER', "ngo_id": 'ngo_helping_hands', "ngo_name": 'Helping Hands Foundation' },
    { "id": 'vol_zara_02', "name": 'Zara Sheikh', "email": 'zara@volunteer.com', "role": 'VOLUNTEER', "ngo_id": 'ngo_helping_hands', "ngo_name": 'Helping Hands Foundation' },
    { "id": 'sup_deepak_1', "name": 'Deepak Chawla', "email": 'deepak@ngo.com', "role": 'SUPERVISOR', "ngo_id": 'ngo_helping_hands', "ngo_name": 'Helping Hands Foundation' },
]

def seed_users():
    print("Seeding users to Firestore...")
    for user in MOCK_USERS:
        doc_id = user["id"]
        # Remove id from the dict to avoid duplication inside the doc
        data = {k: v for k, v in user.items() if k != "id"}
        db.collection("users").document(doc_id).set(data, merge=True)
        print(f"User {doc_id} synced.")
    print("Seeding complete!")

if __name__ == "__main__":
    seed_users()

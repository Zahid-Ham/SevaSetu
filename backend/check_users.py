import firebase_admin
from firebase_admin import credentials, firestore
import os

cred_path = os.path.join("backend", "credentials", "firebase-credentials.json")
cred = credentials.Certificate(cred_path)

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

def list_users():
    print("Listing all users in Firestore 'users' collection:")
    docs = db.collection("users").stream()
    count = 0
    for doc in docs:
        print(f"ID: {doc.id} | Name: {doc.to_dict().get('name')}")
        count += 1
    print(f"Total users: {count}")

if __name__ == "__main__":
    list_users()

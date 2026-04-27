import firebase_admin
from firebase_admin import credentials, auth, firestore
import os

# Path to your firebase credentials
cred_path = os.path.join(os.path.dirname(__file__), "credentials", "firebase-credentials.json")
cred = credentials.Certificate(cred_path)

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

DEMO_USERS = [
    {
        "email": "supervisor@demo.com",
        "password": "password123",
        "name": "Demo Supervisor",
        "phone": "+919876543210",
        "role": "SUPERVISOR",
        "ngo_id": "ngo_seva_foundation",
        "ngo_name": "Seva Foundation"
    },
    {
        "email": "volunteer@demo.com",
        "password": "password123",
        "name": "Demo Volunteer",
        "phone": "+919876543211",
        "role": "VOLUNTEER",
        "ngo_id": "ngo_seva_foundation",
        "ngo_name": "Seva Foundation"
    },
    {
        "email": "citizen@demo.com",
        "password": "password123",
        "name": "Demo Citizen",
        "phone": "+919876543212",
        "role": "CITIZEN"
    }
]

def seed_auth_users():
    print("Starting real user seeding (Auth + Firestore)...")
    
    for u in DEMO_USERS:
        try:
            # 1. Create User in Firebase Auth
            try:
                user_record = auth.get_user_by_email(u["email"])
                print(f"User {u['email']} already exists in Auth.")
                uid = user_record.uid
            except auth.UserNotFoundError:
                user_record = auth.create_user(
                    email=u["email"],
                    password=u["password"],
                    display_name=u["name"],
                    phone_number=u["phone"]
                )
                print(f"Created Auth user: {u['email']}")
                uid = user_record.uid

            # 2. Create Profile in Firestore
            profile_data = {
                "uid": uid,
                "name": u["name"],
                "email": u["email"],
                "phone": u["phone"],
                "role": u["role"],
                "createdAt": firestore.SERVER_TIMESTAMP
            }
            
            if "ngo_id" in u:
                profile_data["ngo_id"] = u["ngo_id"]
                profile_data["ngo_name"] = u["ngo_name"]

            db.collection("users").document(uid).set(profile_data, merge=True)
            print(f"Firestore profile synced for {u['role']}: {u['email']}")

        except Exception as e:
            print(f"Error seeding {u['email']}: {str(e)}")

    print("\nSeeding complete! You can now login with:")
    for u in DEMO_USERS:
        print(f"   - {u['role']}: {u['email']} / {u['password']}")

if __name__ == "__main__":
    seed_auth_users()

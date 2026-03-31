import os
import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Setup Firebase Admin
# Change path if your credentials are elsewhere
cred_path = "./credentials/firebase-credentials.json"
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ─────────────────────────────────────────────
#  DEMO VOLUNTEERS
# ─────────────────────────────────────────────

volunteers = [
    {
        "volunteer_id": "vol_anita",
        "name": "Anita Sharma",
        "skills": ["medical", "first_aid", "documentation", "counseling"],
        "area": "Mumbai",
        "available_dates": ["2026-03-30", "2026-03-31", "2026-04-01", "2026-04-05", "2026-04-10"],
        "is_available": True,
        "fatigue_score": 0,
        "updated_at": firestore.SERVER_TIMESTAMP
    },
    {
        "volunteer_id": "vol_rahul",
        "name": "Rahul Deshmukh",
        "skills": ["logistics", "driving", "crowd_management"],
        "area": "Pune",
        "available_dates": ["2026-03-31", "2026-04-02", "2026-04-03", "2026-04-12"],
        "is_available": True,
        "fatigue_score": 1,
        "updated_at": firestore.SERVER_TIMESTAMP
    },
    {
        "volunteer_id": "vol_priya",
        "name": "Priya Kulkarni",
        "skills": ["teaching", "education", "documentation"],
        "area": "Nashik",
        "available_dates": ["2026-04-01", "2026-04-04", "2026-04-15"],
        "is_available": True,
        "fatigue_score": 0,
        "updated_at": firestore.SERVER_TIMESTAMP
    },
    {
        "volunteer_id": "vol_suresh",
        "name": "Suresh Raina",
        "skills": ["construction", "infrastructure", "logistics"],
        "area": "Thane",
        "available_dates": ["2026-03-30", "2026-04-05", "2026-04-06"],
        "is_available": True,
        "fatigue_score": 2,
        "updated_at": firestore.SERVER_TIMESTAMP
    },
    {
        "volunteer_id": "vol_neha",
        "name": "Neha Pande",
        "skills": ["counseling", "documentation", "first_aid"],
        "area": "Nagpur",
        "available_dates": ["2026-04-01", "2026-04-10", "2026-04-11"],
        "is_available": True,
        "fatigue_score": 0,
        "updated_at": firestore.SERVER_TIMESTAMP
    }
]

def seed():
    print("🚀 Seeding demo volunteer profiles to Firestore...")
    for v in volunteers:
        v_id = v.pop("volunteer_id")
        db.collection("volunteer_profiles").document(v_id).set(v, merge=True)
        print(f"   ✅ Saved profile for: {v['name']} ({v_id})")
    
    print("\n✨ Seeding successful! Your auto-assignment engine now has a real pool of volunteers to match.")

if __name__ == "__main__":
    seed()

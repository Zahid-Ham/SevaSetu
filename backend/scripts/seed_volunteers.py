import sys
import os
import random

# Add backend to path for imports
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
sys.path.append(backend_dir)

os.chdir(backend_dir)
from dotenv import load_dotenv
load_dotenv()

from app.config.firebase_config import db

VOLUNTEER_NAMES = [
    "Aarav Sharma", "Aditi Rao", "Arjun Singh", "Ananya Gupta", "Ishaan Malhotra",
    "Jiya Varma", "Kabir Khan", "Kavya Iyer", "Mohit Das", "Nandini Reddy",
    "Omkar Joshi", "Pooja Hegde", "Rahul Bose", "Saanvi Patel", "Tanmay Shah",
    "Vidya Balan", "Yash Chopra", "Zara Sheikh", "Amitabh Bachchan", "Deepika Padukone",
    "Suresh Raina", "Virat Kohli", "Anita Desai", "Sunil Gavaskar", "Mary Kom",
    "Abhinav Bindra", "Sania Mirza", "Pankaj Advani", "Viswanathan Anand", "Mithali Raj",
    "Rohan Bopanna", "Leander Paes", "Mahesh Bhupathi", "Sourav Ganguly", "Sachin Tendulkar",
    "Rahul Dravid", "VVS Laxman", "Yuvraj Singh", "Harbhajan Singh", "Zaheer Khan"
]

SKILLS = ["first_aid", "logistics", "teaching", "construction", "medical", "crowd_management", "documentation", "cooking", "driving", "counseling"]
AREAS = ["Maharashtra", "Mumbai Central", "Pune East", "Nagpur North", "Thane West", "Nashik South", "Kolkata", "Delhi", "Bangalore"]

def seed_volunteers(count=40):
    print(f"👥 Seeding {count} volunteers...")
    col = db.collection("volunteer_profiles")
    
    for i in range(min(count, len(VOLUNTEER_NAMES))):
        name = VOLUNTEER_NAMES[i]
        volunteer_id = f"vol_{name.lower().replace(' ', '_')}"
        
        # Give each volunteer 2-4 random skills
        v_skills = random.sample(SKILLS, k=random.randint(2, 4))
        area = random.choice(AREAS)
        
        profile = {
            "volunteer_id": volunteer_id,
            "name": name,
            "skills": v_skills,
            "area": area,
            "is_available": True,
            "fatigue_score": random.randint(0, 3),
            "available_dates": ["2026-04-01", "2026-04-10", "2026-04-15", "2026-04-20", "2026-05-01"]
        }
        
        col.document(volunteer_id).set(profile)
        if (i+1) % 10 == 0:
            print(f"✅ Added {i+1} volunteers...")

    print("🌟 Volunteer seeding complete!")

if __name__ == "__main__":
    seed_volunteers()

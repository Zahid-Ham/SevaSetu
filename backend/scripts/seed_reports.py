import sys
import os
from datetime import datetime, timedelta
import random

# Add backend to path for imports
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
sys.path.append(backend_dir)

os.chdir(backend_dir) # Change to backend dir so that relative paths in .env work
from dotenv import load_dotenv
load_dotenv()

from app.config.firebase_config import db
from firebase_admin import firestore

CATEGORIES = ["Water", "Sanitation", "Health", "Education", "Infrastructure", "Safety", "Environment"]
STATUSES = ["resolved", "investigating", "pending"]
AREAS = ["Maharashtra", "Mumbai Central", "Pune East", "Nagpur North", "Thane West", "Nashik South"]

REPORT_TEMPLATES = [
    {"title": "Open Manhole Danger", "category": "Sanitation", "desc": "Main road has an open manhole covering for 3 days. High risk for children."},
    {"title": "Water Pipe Leakage", "category": "Water", "desc": "Municipal pipe burst near community well. Wasting thousands of liters."},
    {"title": "Local School Repair", "category": "Education", "desc": "Primary school roof leaking after heavy rains. Need temporary fix."},
    {"title": "Garbage Accumulation", "category": "Sanitation", "desc": "Waste collection vehicle hasn't come for 5 days. Smelling very bad."},
    {"title": "Flu Outbreak Warning", "category": "Health", "desc": "Multiple families reporting high fever in slum colony. Clinic is overcrowded."},
    {"title": "Broken Street Lamp", "category": "Safety", "desc": "Alleyway is completely dark at night. Multiple chain-snatching incidents reported."},
    {"title": "Deforestation in Local Park", "category": "Environment", "desc": "Unauthorized cutting of trees in the community park area."},
    {"title": "Mosquito Breeding Ground", "category": "Health", "desc": "Stagnant water in empty construction site after monsoons. Risk of Dengue."},
    {"title": "Pothole Filling", "category": "Infrastructure", "desc": "NH-48 approach road has severe potholes. Causing traffic and accidents."},
    {"title": "Lack of First Aid", "category": "Health", "desc": "Community health center ran out of basic bandages and medicine supplies."},
]

def seed_reports(count=50):
    print(f"🚀 Seeding {count} community reports to Firestore...")
    col = db.collection("community_reports")
    
    # Optional: Delete existing to start fresh
    # docs = col.stream()
    # for d in docs: d.reference.delete()

    for i in range(count):
        template = random.choice(REPORT_TEMPLATES)
        area = random.choice(AREAS)
        urgency = random.choice(["High", "Moderate", "Low"])
        
        # Spread dates across the last 6 months
        days_ago = random.randint(1, 180)
        created_at = datetime.now() - timedelta(days=days_ago)

        report = {
            "title": f"{template['title']} - {area}",
            "primary_category": template["category"],
            "description": template["desc"],
            "precise_location": area,
            "urgency_level": urgency,
            "status": random.choice(STATUSES),
            "created_at": created_at,
            "source": "historical_seed",
            "is_emergency": urgency == "High"
        }
        
        col.add(report)
        if (i+1) % 10 == 0:
            print(f"✅ Added {i+1} reports...")

    print("⭐ Seeding complete!")

if __name__ == "__main__":
    seed_reports(60)

import sys
import os

# Add backend to path for imports
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
sys.path.append(backend_dir)

os.chdir(backend_dir)
from dotenv import load_dotenv
load_dotenv()

from app.config.firebase_config import db

def audit_system():
    print("🔍 --- SevaSetu System Audit ---")
    
    # 1. Reports
    reports = list(db.collection("community_reports").stream())
    print(f"📄 Community Reports: {len(reports)}")

    # 2. Predicted Events
    events = list(db.collection("predicted_events").stream())
    print(f"🔮 Predicted Events: {len(events)}")
    for e in events:
        data = e.to_dict()
        print(f"   - [{data.get('status')}] {data.get('event_type')} in {data.get('area')} (ID: {e.id})")

    # 3. Volunteers
    volunteers = list(db.collection("volunteer_profiles").stream())
    print(f"👥 Volunteers: {len(volunteers)}")
    for v in volunteers:
        data = v.to_dict()
        print(f"   - {data.get('name')} (ID: {v.id}) - Skills: {data.get('skills', [])}")

    # 4. Assignments
    assignments = list(db.collection("event_assignments").stream())
    print(f"📋 Assignments: {len(assignments)}")
    for a in assignments:
        data = a.to_dict()
        print(f"   - [{data.get('status')}] {data.get('volunteer_name')} -> {data.get('event_id')}")

def cleanup_broken_data():
    """Removes events with no event_type or area."""
    print("🧹 Cleaning up broken data...")
    events = db.collection("predicted_events").stream()
    for e in events:
        data = e.to_dict()
        if not data.get('event_type') or not data.get('area'):
            print(f"   Deleting broken event: {e.id}")
            e.reference.delete()

if __name__ == "__main__":
    audit_system()

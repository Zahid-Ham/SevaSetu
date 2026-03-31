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
from app.services import event_firestore_service

def simulate_volunteer_responses(action="accepted", limit=5):
    """
    Finds pending assignments and simulates volunteer responses.
    action: 'accepted' or 'declined'
    """
    print(f"🤖 Stimulating volunteer {action} for {limit} missions...")
    
    # 1. Fetch pending assignments
    docs = db.collection("event_assignments").where("status", "==", "pending").limit(limit).stream()
    
    count = 0
    for doc in docs:
        assign_id = doc.id
        data = doc.to_dict()
        volunteer_name = data.get('volunteer_name', 'Unknown')
        event_id = data.get('event_id', 'Unknown')
        
        print(f"   - {volunteer_name} is {action} mission {event_id}...")
        
        # 2. Update status
        event_firestore_service.respond_to_assignment(assign_id, action)
        count += 1

    if count == 0:
        print("💡 No pending assignments found to process.")
    else:
        print(f"🌟 Successfully processed {count} volunteer responses!")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Simulate volunteer responses.")
    parser.add_argument("--action", type=str, default="accepted", help="accepted or declined")
    parser.add_argument("--limit", type=int, default=5, help="Number of assignments to process")
    
    args = parser.parse_args()
    simulate_volunteer_responses(action=args.action, limit=args.limit)

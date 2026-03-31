import sys
import os

# Add backend to path for imports
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
sys.path.append(backend_dir)

os.chdir(backend_dir)
from dotenv import load_dotenv
load_dotenv()

from app.services import assignment_service, event_firestore_service

def verify_capacity():
    print("🔍 Testing Auto-Assignment Engine with Target: 40...")
    
    # 1. Create a dummy event with high headcount requirement
    test_event = {
        "id": "test_capacity_1",
        "event_type": "Mega Community Cleanup",
        "category": "Sanitation",
        "predicted_date_start": "2026-05-10",
        "predicted_date_end": "2026-05-12",
        "estimated_headcount": 40,
        "required_skills": ["logistics", "crowd_management"],
        "area": "Maharashtra"
    }
    
    # 2. Fetch all seeded volunteers
    volunteers = event_firestore_service.get_all_volunteer_profiles()
    print(f"   - Total volunteers in system: {len(volunteers)}")
    
    # 3. Run assignment
    ranked = assignment_service.run_auto_assignment(
        event=test_event,
        all_volunteers=volunteers,
        top_n=40
    )
    
    print(f"✅ Success! Auto-assignment found {len(ranked)}/40 volunteers.")
    
    if len(ranked) > 0:
        print("\nTop 5 Matches:")
        for i, r in enumerate(ranked[:5]):
            print(f"  {i+1}. {r['volunteer_name']} - Score: {r['match_score']} (Skills: {r['score_breakdown']['skill_match_pct']}%, Dates: {r['score_breakdown']['availability_pct']}%)")
    else:
        print("❌ Error: Still finding 0 volunteers. Logic check needed.")

if __name__ == "__main__":
    verify_capacity()

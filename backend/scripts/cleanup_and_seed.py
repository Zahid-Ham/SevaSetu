"""
cleanup_and_seed.py
Clears ALL events from Firestore and seeds 5 clean, properly-structured events.
Run once to restore a sane database state.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import event_firestore_service
from app.config.firebase_config import db

def cleanup():
    print("🗑️  Deleting all existing predicted_events...")
    docs = db.collection("predicted_events").stream()
    count = 0
    for doc in docs:
        doc.reference.delete()
        count += 1
    print(f"   Deleted {count} documents.")

    print("\n🗑️  Deleting all existing event_assignments...")
    docs = db.collection("event_assignments").stream()
    count = 0
    for doc in docs:
        doc.reference.delete()
        count += 1
    print(f"   Deleted {count} documents.")

    print("\n🗑️  Deleting all existing app_notifications...")
    docs = db.collection("app_notifications").stream()
    count = 0
    for doc in docs:
        doc.reference.delete()
        count += 1
    print(f"   Deleted {count} documents.")

def seed():
    print("\n🌱 Seeding 5 clean AI predictions...")
    
    from datetime import date, timedelta
    today = date.today()
    def d(offset): return (today + timedelta(days=offset)).isoformat()

    missions = [
        {
            "event_type": "Clean Water Camp",
            "category": "Water",
            "description": "Seasonal water scarcity and 3 recent community complaints indicate high demand for a distribution camp. Similar events had 89% positive impact last April.",
            "predicted_date_start": d(8),
            "predicted_date_end": d(11),
            "estimated_headcount": 18,
            "required_skills": ["logistics", "driving", "crowd_management"],
            "confidence_score": 0.91,
            "confidence_reason": "Strong seasonal pattern + 4 recent water complaints in this area.",
            "area": "Pune, Maharashtra",
            "suggested_govt_scheme": "Jal Jeevan Mission",
            "tier": "high",
            "status": "predicted",
        },
        {
            "event_type": "Health Screening Camp",
            "category": "Health",
            "description": "Community reports of respiratory issues signal a preventive health camp. Historical data confirms a similar surge in this period annually.",
            "predicted_date_start": d(14),
            "predicted_date_end": d(17),
            "estimated_headcount": 25,
            "required_skills": ["first_aid", "medical", "counseling"],
            "confidence_score": 0.87,
            "confidence_reason": "Recurring annual health pattern, high match with current community data.",
            "area": "Nashik, Maharashtra",
            "suggested_govt_scheme": "Ayushman Bharat",
            "tier": "high",
            "status": "predicted",
        },
        {
            "event_type": "Food Distribution Drive",
            "category": "Sanitation",
            "description": "End-of-month food scarcity patterns in low-income clusters detected. Past drives in similar windows had 95% volunteer attendance.",
            "predicted_date_start": d(22),
            "predicted_date_end": d(24),
            "estimated_headcount": 30,
            "required_skills": ["logistics", "cooking", "crowd_management", "driving"],
            "confidence_score": 0.79,
            "confidence_reason": "Periodic food scarcity data + strong volunteer pool in area.",
            "area": "Mumbai, Maharashtra",
            "suggested_govt_scheme": "PM Garib Kalyan Anna Yojana",
            "tier": "medium",
            "status": "predicted",
        },
        {
            "event_type": "Road Survey Camp",
            "category": "Infrastructure",
            "description": "Post-monsoon road damage complaints rose 40% in the last 2 weeks. Volunteer-led survey needed before municipal response.",
            "predicted_date_start": d(30),
            "predicted_date_end": d(33),
            "estimated_headcount": 12,
            "required_skills": ["construction", "documentation", "logistics"],
            "confidence_score": 0.68,
            "confidence_reason": "Infrastructure complaints trending up; timing is still uncertain.",
            "area": "Nagpur, Maharashtra",
            "suggested_govt_scheme": "PMGSY",
            "tier": "medium",
            "status": "predicted",
        },
        {
            "event_type": "Digital Literacy Workshop",
            "category": "Education",
            "description": "Government digital scheme enrollment deadlines approaching — community members need help with online registrations.",
            "predicted_date_start": d(45),
            "predicted_date_end": d(47),
            "estimated_headcount": 10,
            "required_skills": ["teaching", "documentation", "counseling"],
            "confidence_score": 0.62,
            "confidence_reason": "Moderate signal — depends on scheme deadline which can shift.",
            "area": "Aurangabad, Maharashtra",
            "suggested_govt_scheme": "Digital India",
            "tier": "low",
            "status": "predicted",
        },
    ]
    
    for m in missions:
        event_id = event_firestore_service.save_predicted_event(m)
        print(f"   ✅ Seeded [{m['tier'].upper()}] {m['event_type']} → {event_id[:10]}...")

def main():
    cleanup()
    seed()
    print("\n✨ Done! Database is clean with 5 fresh AI predictions.")
    print("   You can now confirm missions and they will persist correctly.")

if __name__ == "__main__":
    main()

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import event_firestore_service

events = event_firestore_service.get_all_predicted_events()
print(f"Total events in DB: {len(events)}")
for e in events:
    tier = e.get("tier", "NONE")
    status = e.get("status", "?")
    etype = e.get("event_type", "?")
    eid = e.get("id", "?")[:10]
    print(f"  [{status}] {etype} (id={eid})  tier={tier}")

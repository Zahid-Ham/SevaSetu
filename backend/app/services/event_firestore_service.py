from app.config.firebase_config import db  # type: ignore
from firebase_admin import firestore  # type: ignore
from google.cloud.firestore_v1.base_query import FieldFilter
from typing import Optional
import datetime

# ─────────────────────────────────────────────
#  PREDICTED EVENTS
# ─────────────────────────────────────────────

def save_predicted_event(event_data: dict) -> str:
    db_data = event_data.copy()
    db_data['created_at'] = firestore.SERVER_TIMESTAMP
    db_data['status'] = db_data.get('status', 'predicted')
    _, doc_ref = db.collection("predicted_events").add(db_data)
    return doc_ref.id


def create_manual_event(event_data: dict) -> str:
    """Creates a manual confirmed event directly in Firestore."""
    db_data = event_data.copy()
    db_data['created_at'] = firestore.SERVER_TIMESTAMP
    db_data['status'] = 'confirmed'  # Manual events are born confirmed
    db_data['source'] = 'manual'
    _, doc_ref = db.collection("predicted_events").add(db_data)
    return doc_ref.id


def get_all_predicted_events() -> list:
    docs = db.collection("predicted_events") \
             .order_by("created_at", direction=firestore.Query.DESCENDING) \
             .stream()
    events = []
    
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        
        # If confirmed, count accepted volunteers
        if data.get("status") == "confirmed":
            accepted = db.collection("event_assignments") \
                         .where(filter=FieldFilter("event_id", "==", doc.id)) \
                         .where(filter=FieldFilter("status", "==", "accepted")) \
                         .stream()
            data["accepted_count"] = len(list(accepted))
        else:
            data["accepted_count"] = 0
            
        events.append(_serialize_timestamps(data))
    return events


def get_predicted_event(event_id: str) -> Optional[dict]:
    doc = db.collection("predicted_events").document(event_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return _serialize_timestamps(data)


def update_predicted_event(event_id: str, updates: dict) -> None:
    db.collection("predicted_events").document(event_id).update(updates)


def confirm_predicted_event(event_id: str) -> None:
    db.collection("predicted_events").document(event_id).update({
        "status": "confirmed",
        "confirmed_at": firestore.SERVER_TIMESTAMP,
    })


def dismiss_predicted_event(event_id: str) -> None:
    db.collection("predicted_events").document(event_id).update({
        "status": "dismissed",
    })


def delete_predicted_event(event_id: str) -> None:
    db.collection("predicted_events").document(event_id).delete()


def stop_predicted_event(event_id: str) -> None:
    db.collection("predicted_events").document(event_id).update({
        "status": "stopped",
        "stopped_at": firestore.SERVER_TIMESTAMP,
    })


# ─────────────────────────────────────────────
#  VOLUNTEER PROFILES
# ─────────────────────────────────────────────

def upsert_volunteer_profile(volunteer_id: str, profile_data: dict) -> None:
    profile_data['updated_at'] = firestore.SERVER_TIMESTAMP
    db.collection("volunteer_profiles").document(volunteer_id).set(profile_data, merge=True)


def get_volunteer_profile(volunteer_id: str) -> Optional[dict]:
    doc = db.collection("volunteer_profiles").document(volunteer_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return _serialize_timestamps(data)


def get_all_volunteer_profiles() -> list:
    docs = db.collection("volunteer_profiles").stream()
    profiles = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        profiles.append(_serialize_timestamps(data))
    return profiles


def increment_volunteer_fatigue(volunteer_id: str, amount: int = 1) -> None:
    ref = db.collection("volunteer_profiles").document(volunteer_id)
    ref.update({"fatigue_score": firestore.Increment(amount)})


def decrement_volunteer_fatigue(volunteer_id: str, amount: int = 1) -> None:
    ref = db.collection("volunteer_profiles").document(volunteer_id)
    ref.update({"fatigue_score": firestore.Increment(-amount)})


# ─────────────────────────────────────────────
#  EVENT ASSIGNMENTS
# ─────────────────────────────────────────────

def create_assignment(assignment_data: dict) -> str:
    db_data = assignment_data.copy()
    db_data['created_at'] = firestore.SERVER_TIMESTAMP
    db_data['status'] = 'pending'
    _, doc_ref = db.collection("event_assignments").add(db_data)
    return doc_ref.id


def get_assignments_for_event(event_id: str) -> list:
    docs = db.collection("event_assignments") \
             .where(filter=FieldFilter("event_id", "==", event_id)) \
             .stream()
    assignments = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        assignments.append(_serialize_timestamps(data))
    return assignments


def get_assignments_for_volunteer(volunteer_id: str) -> list:
    # Removed order_by to avoid Firestore Composite Index requirements
    docs = db.collection("event_assignments") \
             .where(filter=FieldFilter("volunteer_id", "==", volunteer_id)) \
             .stream()
    assignments = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        assignments.append(_serialize_timestamps(data))
    
    # Sort in memory to avoid index crash
    assignments.sort(key=lambda x: str(x.get('created_at', '')), reverse=True)
    return assignments


def respond_to_assignment(assignment_id: str, status: str) -> None:
    """
    Volunteer accepts or declines. 
    Updates the assignment AND the parent event's 'accepted_count' for real-time Fill Rate.
    """
    # 1. Fetch assignment to get the event_id
    doc_ref = db.collection("event_assignments").document(assignment_id)
    doc = doc_ref.get()
    if not doc.exists:
        return
    
    data = doc.to_dict()
    event_id = data.get("event_id")
    prev_status = data.get("status", "pending")

    # 2. Update status and timestamp
    doc_ref.update({
        "status": status,
        "responded_at": firestore.SERVER_TIMESTAMP,
    })

    # 3. If transitioning to 'accepted', increment the event's count
    if status == "accepted" and prev_status != "accepted":
        if event_id:
            event_ref = db.collection("predicted_events").document(event_id)
            event_ref.update({"accepted_count": firestore.Increment(1)})
    
    # 4. If transitioning AWAY from 'accepted' (e.g. manual decline), decrement
    elif prev_status == "accepted" and status != "accepted":
        if event_id:
            event_ref = db.collection("predicted_events").document(event_id)
            event_ref.update({"accepted_count": firestore.Increment(-1)})


def get_assignment(assignment_id: str) -> Optional[dict]:
    doc = db.collection("event_assignments").document(assignment_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["id"] = doc.id
    return _serialize_timestamps(data)


def override_assignment(assignment_id: str, new_volunteer_id: str, new_volunteer_name: str) -> None:
    db.collection("event_assignments").document(assignment_id).update({
        "volunteer_id": new_volunteer_id,
        "volunteer_name": new_volunteer_name,
        "status": "pending",
        "overridden": True,
        "overridden_at": firestore.SERVER_TIMESTAMP,
    })


def bulk_dispatch_assignments(event_id: str, ranked_volunteers: list[dict], event_ref: dict) -> list[dict]:
    """
    DISPATCH ENGINE: Atomic batch write for creating all assignments, notifications, 
    and updating fatigue scores in a single network round-trip.
    """
    batch = db.batch()
    created_assignments = []
    
    event_type = event_ref.get('event_type', 'Emergency Mission')
    event_area = event_ref.get('area', 'TBD')
    event_start = event_ref.get('predicted_date_start', 'TBD')
    required_skills = event_ref.get('required_skills', [])

    for volunteer in ranked_volunteers:
        volunteer_id = volunteer.get("volunteer_id")
        if not volunteer_id:
            continue

        # 1. Assignment doc
        assign_ref = db.collection("event_assignments").document()
        assignment_data = volunteer.copy()
        assignment_data["id"] = assign_ref.id
        assignment_data["created_at"] = firestore.SERVER_TIMESTAMP
        assignment_data["status"] = "pending"
        batch.set(assign_ref, assignment_data)
        created_assignments.append(assignment_data)

        # 2. Notification doc
        notif_ref = db.collection("app_notifications").document()
        
        # Calculate skills label for notification text
        matches = sum(1 for s in required_skills if s in volunteer.get("volunteer_skills", []))
        skills_matched = f"{matches}/{len(required_skills)}" if required_skills else "All"
        
        notif_data = {
            "volunteer_id": volunteer_id,
            "type": "assignment",
            "title": f"🚀 New Mission: {event_type}",
            "body": f"You match {skills_matched} skills for a mission on {event_start} in {event_area}. Please accept or decline.",
            "assignment_id": assign_ref.id,
            "event_id": event_id,
            "read": False,
            "created_at": firestore.SERVER_TIMESTAMP,
        }
        batch.set(notif_ref, notif_data)

        # 3. Fatigue increment
        prof_ref = db.collection("volunteer_profiles").document(volunteer_id)
        batch.update(prof_ref, {"fatigue_score": firestore.Increment(1)})

    # Commit all concurrently
    batch.commit()
    # Serialize for return
    return [_serialize_timestamps(a) for a in created_assignments]


# ─────────────────────────────────────────────
#  IN-APP NOTIFICATIONS
# ─────────────────────────────────────────────

def create_notification(volunteer_id: str, notification_data: dict) -> str:
    notification_data['volunteer_id'] = volunteer_id
    notification_data['created_at'] = firestore.SERVER_TIMESTAMP
    notification_data['read'] = False
    _, doc_ref = db.collection("app_notifications").add(notification_data)
    return doc_ref.id


def get_notifications_for_volunteer(volunteer_id: str) -> list:
    # Removed order_by and limit to avoid Firestore Composite Index requirements
    docs = db.collection("app_notifications") \
             .where(filter=FieldFilter("volunteer_id", "==", volunteer_id)) \
             .stream()
    notifications = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        notifications.append(_serialize_timestamps(data))
        
    # Sort and slice in memory
    notifications.sort(key=lambda x: str(x.get('created_at', '')), reverse=True)
    return notifications[:50]


def mark_notification_read(notification_id: str) -> None:
    db.collection("app_notifications").document(notification_id).update({"read": True})


# ─────────────────────────────────────────────
#  EVENT FEEDBACK
# ─────────────────────────────────────────────

def save_feedback(feedback_data: dict) -> str:
    feedback_data['created_at'] = firestore.SERVER_TIMESTAMP
    _, doc_ref = db.collection("event_feedback").add(feedback_data)
    return doc_ref.id


# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

def _serialize_timestamps(data: any) -> any:
    """
    Recursively cleans Firestore data to ensure it's JSON serializable.
    Strips out Sentinels, DocumentReferences, and converts Timestamps to ISO strings.
    """
    if isinstance(data, dict):
        return {k: _serialize_timestamps(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_serialize_timestamps(i) for i in data]
    elif hasattr(data, 'isoformat'):
        return data.isoformat()
    elif 'Sentinel' in str(type(data)):
        # Default to now if it's a Firestore sentinel in-mem
        return datetime.datetime.utcnow().isoformat()
    elif isinstance(data, (datetime.datetime, datetime.date)):
        return data.isoformat()
    # Handle other non-serializable objects (like DocumentReference)
    elif hasattr(data, 'id') and hasattr(data, 'path'):
        return data.id 
    
    return data

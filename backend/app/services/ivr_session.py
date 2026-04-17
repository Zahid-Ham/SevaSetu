# backend/app/services/ivr_session.py
from datetime import datetime

# In-memory session store (In production, use Redis)
IVR_SESSION_STORE = {}

def get_ivr_session(call_sid):
    """Retrieve or create a session for a specific call."""
    if call_sid not in IVR_SESSION_STORE:
        IVR_SESSION_STORE[call_sid] = {
            "step": "START",
            "language": "en-IN", # Default
            "name": None,
            "category": None,
            "location": None,
            "description": None,
            "transcription": None, # Current active transcription
            "report_id": None,
            "created_at": datetime.now()
        }
    return IVR_SESSION_STORE[call_sid]

def update_ivr_session(call_sid, data):
    """Update session details."""
    session = get_ivr_session(call_sid)
    session.update(data)
    return session

def clear_ivr_session(call_sid):
    """Clear session after completion/failure."""
    if call_sid in IVR_SESSION_STORE:
        del IVR_SESSION_STORE[call_sid]

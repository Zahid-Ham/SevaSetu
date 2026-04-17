from typing import Dict, Any

# Session management for stateless SMS webhook calls
# Key: Phone Number (e.g., '+15672298167')
# Value: Dict representing the user's current conversational state
SESSION_STORE: Dict[str, Dict[str, Any]] = {}

def get_session(phone: str) -> Dict[str, Any]:
    """Retrieves or initializes a session for a given phone number."""
    if phone not in SESSION_STORE:
        SESSION_STORE[phone] = {
            "step": "START",
            "data": {
                "media_attachments": []
            }
        }
    return SESSION_STORE[phone]

def update_session(phone: str, step: str = None, data_update: Dict[str, Any] = None):
    """Updates the session state and/or data."""
    session = get_session(phone)
    if step:
        session["step"] = step
    if data_update:
        session["data"].update(data_update)

def clear_session(phone: str):
    """Resets the session."""
    if phone in SESSION_STORE:
        del SESSION_STORE[phone]

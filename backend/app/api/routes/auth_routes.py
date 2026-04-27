from fastapi import APIRouter, Depends, HTTPException
from app.api.middleware.auth_middleware import get_current_user
from app.api.routes import ngo_routes
from app.config.firebase_config import db

router = APIRouter()

@router.get("/me")
async def get_my_profile(decoded_token: dict = Depends(get_current_user)):
    """
    Returns the user's Firestore profile based on the UID in the verified token.
    Used by the frontend to restore sessions.
    """
    uid = decoded_token.get("uid")
    user_doc = db.collection("users").document(uid).get()
    
    if not user_doc.exists:
        # Fallback for mock users who might not be in Firestore but are in Firebase Auth
        return {
            "uid": uid,
            "email": decoded_token.get("email"),
            "role": "CITIZEN", # Default
            "is_new": True
        }
    
    profile = user_doc.to_dict()
    profile["uid"] = user_doc.id
    return profile

@router.post("/verify-session")
async def verify_session(decoded_token: dict = Depends(get_current_user)):
    """
    Simple check to see if a token is valid.
    """
    return {"status": "valid", "uid": decoded_token.get("uid")}

@router.get("/verify-passport/{citizen_id}")
async def verify_passport(citizen_id: str):
    """
    Returns limited citizen profile for passport verification.
    """
    # citizen_id might be "SEVA-PASS-XXXX" where XXXX is UID or first 8 chars
    uid = citizen_id
    if citizen_id.startswith("SEVA-PASS-"):
        uid = citizen_id.replace("SEVA-PASS-", "")
    
    # Try direct UID first
    user_doc = db.collection("users").document(uid).get()
    
    # If not found, try lowercase (frontend might have uppercased it)
    if not user_doc.exists:
        user_doc = db.collection("users").document(uid.lower()).get()
    
    # If still not found, try searching by prefix case-insensitively
    if not user_doc.exists:
        docs = db.collection("users").stream()
        for doc in docs:
            if doc.id.upper() == uid.upper() or doc.id.upper().startswith(uid.upper() if len(uid) == 8 else "NOT_8_CHARS"):
                user_doc = doc
                break
    
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="Citizen not found")
        
    profile = user_doc.to_dict()
    # Only return public fields
    return {
        "success": True,
        "citizen": {
            "name": profile.get("name"),
            "email": profile.get("email"),
            "role": profile.get("role"),
            "id": user_doc.id,
            "created_at": profile.get("created_at")
        }
    }

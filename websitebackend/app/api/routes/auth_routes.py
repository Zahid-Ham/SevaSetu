from fastapi import APIRouter, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore
from app.services.auth_service import verify_google_token
from app.services.firebase_service import get_or_create_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class GoogleAuthRequest(BaseModel):
    id_token: str
    role: str  # citizen, volunteer, supervisor
    access_token: str | None = None


class AuthResponse(BaseModel):
    message: str
    user: dict


@router.post("/google", response_model=AuthResponse)
async def google_auth(request: GoogleAuthRequest):
    """
    Authenticate a user with their Google ID token.
    Creates or updates the user in Firestore with their selected role.
    """
    # Verify the Google ID token
    user_info = verify_google_token(request.id_token)

    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    # Validate role
    valid_roles = ["citizen", "volunteer", "supervisor"]
    if request.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    # Create or update user in Firestore
    user_data = {
        "uid": user_info["uid"],
        "email": user_info["email"],
        "display_name": user_info["display_name"],
        "photo_url": user_info["photo_url"],
        "role": request.role,
    }

    user = get_or_create_user(user_data)

    return AuthResponse(
        message="Authentication successful",
        user=user,
    )

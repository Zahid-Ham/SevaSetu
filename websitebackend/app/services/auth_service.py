from firebase_admin import auth as firebase_auth  # type: ignore


def verify_google_token(id_token: str) -> dict | None:
    """
    Verifies a Firebase ID token using Firebase Admin SDK.
    Returns user info if valid, None otherwise.
    """
    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email", ""),
            "display_name": decoded_token.get("name", ""),
            "photo_url": decoded_token.get("picture", ""),
            "email_verified": decoded_token.get("email_verified", False),
        }
    except Exception as e:
        print(f"Token verification error: {e}")
        return None


def get_access_token_from_header(authorization: str) -> str | None:
    """
    Extracts the access token from an Authorization header.
    Expected format: 'Bearer <token>'
    """
    if not authorization:
        return None
    parts = authorization.split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None

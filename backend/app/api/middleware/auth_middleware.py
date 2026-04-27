from firebase_admin import auth as firebase_auth
from fastapi import HTTPException, Header, Depends
from typing import Optional

async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Middleware to verify the Firebase ID token from the Authorization header.
    Expects format: Bearer <token>
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    if not authorization.startswith("Bearer "):
        print("[Auth Middleware] ❌ Invalid Header")
        raise HTTPException(status_code=401, detail="Invalid authorization scheme. Use 'Bearer <token>'")
    
    id_token = authorization.split("Bearer ")[1]
    print("[Auth Middleware] 🔍 Verifying token...")
    
    try:
        # Verify the ID token using Firebase Admin SDK
        decoded_token = firebase_auth.verify_id_token(id_token)
        print(f"[Auth Middleware] ✅ Success! User: {decoded_token.get('email') or decoded_token.get('uid')}")
        return decoded_token
    except ValueError as e:
        # Token is invalid
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        # Other errors (expired, etc)
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

async def require_role(roles: list[str]):
    """
    Optional: Dependency factory to check for specific roles in the token
    (Assumes role is stored as a custom claim or we fetch it from Firestore in a real app)
    """
    async def role_checker(token: dict = Depends(get_current_user)):
        # For SevaSetu, we usually check role from Firestore. 
        # Decoded token contains UID, which we can use to look up role.
        pass
    return role_checker

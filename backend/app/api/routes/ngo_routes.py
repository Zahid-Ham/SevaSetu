from fastapi import APIRouter, HTTPException # type: ignore
from pydantic import BaseModel # type: ignore
from typing import List, Optional
from app.services.ngo_service import ( # type: ignore
    get_all_ngos, 
    create_volunteer_request, 
    get_pending_requests, 
    update_request_status,
    get_user_request
)

router = APIRouter()

class VolunteerRequestCreate(BaseModel):
    citizen_id: str
    citizen_name: str
    ngo_id: str
    ngo_name: str
    motivation: str
    skills: List[str]
    area: str

class RequestUpdate(BaseModel):
    status: str
    supervisor_id: Optional[str] = None

@router.get("/ngos")
async def list_ngos():
    """
    Lists all available NGOs.
    """
    try:
        return get_all_ngos()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/volunteer-requests")
async def apply_to_volunteer(request: VolunteerRequestCreate):
    """
    Submits a new volunteer application.
    """
    try:
        request_id = create_volunteer_request(request.dict())
        return {"message": "Application submitted successfully", "id": request_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/volunteer-requests/user/{citizen_id}")
async def fetch_user_request(citizen_id: str):
    """
    Checks if a user has a pending/approved volunteer application.
    """
    try:
        request = get_user_request(citizen_id)
        if request:
            return request
        return {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/volunteer-requests/{ngo_id}")
async def list_pending_requests(ngo_id: str):
    """
    Lists pending requests for a specific NGO.
    """
    try:
        return get_pending_requests(ngo_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/volunteer-requests/{request_id}/review")
async def review_request(request_id: str, update: RequestUpdate):
    """
    Approve or reject a volunteer request.
    """
    try:
        if update.status not in ["APPROVED", "REJECTED"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        success = update_request_status(request_id, update.status, update.supervisor_id)
        if success:
            return {"message": f"Request {update.status.lower()} successfully"}
        return {"message": "Failed to update request"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/ngos/{ngo_id}/volunteers")
async def list_ngo_volunteers(ngo_id: str):
    """
    Lists all active volunteers for a specific NGO.
    """
    try:
        from app.services.ngo_service import get_ngo_volunteers
        return get_ngo_volunteers(ngo_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

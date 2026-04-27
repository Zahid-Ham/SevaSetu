from fastapi import APIRouter, HTTPException, BackgroundTasks # type: ignore
from typing import List, Optional
from app.services.certificate_service import (
    db, 
    check_and_award_badges, 
    check_and_issue_certificates, 
    BADGE_DEFS,
    CERT_TIERS,
    regenerate_certificate_logic
) # type: ignore
from datetime import datetime

router = APIRouter()

@router.get("/volunteer/{volunteer_id}")
async def get_volunteer_recognition(volunteer_id: str):
    """
    Returns all certificates and badges for a volunteer.
    """
    try:
        # Fetch certificates
        certs_ref = db.collection("certificates")
        certs_docs = certs_ref.where("volunteer_id", "==", volunteer_id).stream()
        certificates = []
        for doc in certs_docs:
            data = doc.to_dict()
            certificates.append(data)
            
        # Fetch badges
        badges_ref = db.collection("volunteer_badges").document(volunteer_id)
        badges_doc = badges_ref.get()
        earned_badge_ids = badges_doc.to_dict().get("badges", []) if badges_doc.exists else []
        
        # Format badges with metadata
        badges = []
        for b_id, meta in BADGE_DEFS.items():
            badges.append({
                "id": b_id,
                "label": meta["label"],
                "icon": meta["icon"],
                "description": meta["description"],
                "is_earned": b_id in earned_badge_ids
            })
            
        # Calculate progress to next tier
        reports_count = len(list(db.collection("community_reports").where("volunteer_id", "==", volunteer_id).stream()))
        
        next_tier = None
        for tier, config in CERT_TIERS.items():
            if reports_count < config["threshold"]:
                next_tier = {
                    "tier": tier,
                    "label": config["label"],
                    "current": reports_count,
                    "threshold": config["threshold"],
                    "remaining": config["threshold"] - reports_count
                }
                break
                
        return {
            "success": True,
            "volunteer_id": volunteer_id,
            "certificates": certificates,
            "badges": badges,
            "next_tier": next_tier,
            "stats": {
                "total_reports": reports_count
            }
        }
    except Exception as e:
        print(f"[Cert Routes] Error fetching recognition: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify/{certificate_id}")
async def verify_certificate(certificate_id: str):
    """
    Public endpoint to verify a certificate's authenticity.
    """
    try:
        cert_doc = db.collection("certificates").document(certificate_id).get()
        if not cert_doc.exists:
            return {
                "success": False,
                "is_valid": False,
                "message": "Certificate not found or invalid."
            }
            
        cert_data = cert_doc.to_dict()
        return {
            "success": True,
            "is_valid": cert_data.get("status") == "active",
            "certificate": {
                "id": cert_data.get("id"),
                "volunteer_name": cert_data.get("volunteer_name"),
                "ngo_name": cert_data.get("ngo_name"),
                "tier": cert_data.get("tier"),
                "tier_label": cert_data.get("tier_label"),
                "issue_date": cert_data.get("issue_date"),
                "description": cert_data.get("description")
            }
        }
    except Exception as e:
        print(f"[Cert Routes] Error verifying certificate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-eligibility/{volunteer_id}")
async def trigger_eligibility_check(volunteer_id: str, background_tasks: BackgroundTasks):
    """
    Manually trigger a check for badges and certificates.
    Useful for testing or force-refreshing.
    """
    try:
        background_tasks.add_task(check_and_award_badges, volunteer_id)
        background_tasks.add_task(check_and_issue_certificates, volunteer_id)
        return {"success": True, "message": "Eligibility check started in background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/regenerate/{certificate_id}")
async def regenerate_certificate(certificate_id: str):
    """
    Force regenerates a certificate and updates its design.
    """
    try:
        new_id = await regenerate_certificate_logic(certificate_id)
        if not new_id:
            raise HTTPException(status_code=404, detail="Certificate not found")
            
        return {"success": True, "message": "Certificate regenerated successfully", "certificate_id": new_id}
    except Exception as e:
        print(f"[Cert Routes] Error regenerating certificate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

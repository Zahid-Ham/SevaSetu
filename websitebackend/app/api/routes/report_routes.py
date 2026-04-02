from fastapi import APIRouter, HTTPException, Query  # type: ignore
from app.services.firebase_service import get_user_reports, get_report_by_id

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/")
async def list_reports(user_email: str = Query(..., description="User email to fetch reports for")):
    """
    Lists all generated survey reports for a user.
    """
    try:
        reports = get_user_reports(user_email)
        return {"reports": reports, "count": len(reports)}
    except Exception as e:
        print(f"Error fetching reports: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch reports: {str(e)}")


@router.get("/{report_id}")
async def get_report(report_id: str):
    """
    Gets a specific report by its ID.
    """
    report = get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"report": report}

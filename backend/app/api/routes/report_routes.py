from fastapi import APIRouter, HTTPException  # type: ignore
from app.models.report_model import ReportCreate  # type: ignore
from app.services.firestore_service import save_report, get_all_reports  # type: ignore

router = APIRouter()

@router.post("/submit-report")
async def submit_report(report: ReportCreate):
    """
    Endpoint to save a verified report to Firestore.
    """
    try:
        report_dict = report.dict()
        report_id = save_report(report_dict)
        return {
            "success": True,
            "report_id": report_id
        }
    except Exception as e:
        print(f"Error in submit-report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports")
async def get_reports():
    """
    Endpoint to retrieve all submitted community reports from Firestore.
    """
    try:
        reports = get_all_reports()
        return {
            "success": True,
            "reports": reports
        }
    except Exception as e:
        print(f"Error in get-reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

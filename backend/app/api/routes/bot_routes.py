from fastapi import APIRouter, HTTPException
from app.models.report_model import ReportCreate
from app.services.firestore_service import save_report
from app.services.ngo_service import get_nearest_ngo_by_coords, get_nearest_ngo_by_city
from typing import Optional

router = APIRouter()

@router.post("/bot-report")
async def submit_bot_report(report: ReportCreate):
    """
    Endpoint for the Telegram bot to submit a citizen report.
    It automatically assigns the report to the nearest NGO.
    """
    try:
        report_dict = report.dict()
        
        # Auto-assignment logic
        assigned_ngo = None
        
        # 1. Try by GPS coordinates
        if report.gps_coordinates:
            try:
                lat_str, lon_str = report.gps_coordinates.split(',')
                lat, lon = float(lat_str), float(lon_str)
                assigned_ngo = get_nearest_ngo_by_coords(lat, lon)
            except Exception as e:
                print(f"[bot-report] GPS parsing failed: {e}")
        
        # 2. Try by city if GPS didn't work (fallbacks)
        if not assigned_ngo and report.location:
            assigned_ngo = get_nearest_ngo_by_city(report.location)
            
        if assigned_ngo:
            report_dict["assigned_ngo_id"] = assigned_ngo.get("id")
            report_dict["assigned_ngo_name"] = assigned_ngo.get("name")
            print(f"[bot-report] Assigned to NGO: {report_dict['assigned_ngo_name']} ({report_dict['assigned_ngo_id']})")
        else:
            print(f"[bot-report] No matching NGO found for location: {report.location or report.gps_coordinates}")

        # Ensure source is marked
        if not report_dict.get("report_source"):
            report_dict["report_source"] = "telegram_bot"

        report_id = save_report(report_dict)
        
        return {
            "success": True,
            "report_id": report_id,
            "assigned_ngo": report_dict.get("assigned_ngo_name") or "None"
        }
    except Exception as e:
        print(f"Error in submit-bot-report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

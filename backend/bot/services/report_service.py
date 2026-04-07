import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")

def submit_bot_report_to_api(report_data: dict):
    """
    Submits the report data to the FastAPI backend.
    """
    try:
        url = f"{API_BASE_URL}/bot-report"
        print(f"Submitting to {url}...")
        response = requests.post(url, json=report_data)
        return response.json()
    except Exception as e:
        print(f"Report submission API error: {e}")
        return {"success": False, "detail": str(e)}

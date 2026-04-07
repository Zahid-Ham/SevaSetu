from pydantic import BaseModel # type: ignore
from typing import Optional, List

class ReportCreate(BaseModel):
    # Metadata
    citizen_name: Optional[str] = None
    phone: Optional[str] = None
    precise_location: Optional[str] = None
    gps_coordinates: Optional[str] = None
    demographic_tally: Optional[int] = None
    
    # Problem
    executive_summary: Optional[str] = None
    primary_category: Optional[str] = None
    sub_category: Optional[str] = None
    problem_status: Optional[str] = None
    duration_of_problem: Optional[str] = None
    urgency_level: Optional[str] = None
    service_status: Optional[str] = None

    # Impact
    severity_score: Optional[int] = None
    severity_reason: Optional[str] = None
    population_affected: Optional[int] = None
    vulnerable_group: Optional[str] = None
    vulnerability_flag: Optional[str] = None
    secondary_impact: Optional[str] = None

    # Action & Follow-up
    expected_resolution_timeline: Optional[List[str]] = None
    detailed_resolution_steps: Optional[List[str]] = None
    follow_up_date: Optional[str] = None
    status: Optional[str] = "Open"
    govt_scheme_applicable: Optional[str] = None
    ai_recommended_actions: Optional[str] = None

    # Insights
    previous_complaints_insights: Optional[str] = None

    # Qualitative
    key_complaints: Optional[List[str]] = None
    sentiment: Optional[str] = None
    key_quote: Optional[str] = None
    description: Optional[str] = None
    
    # System Data
    auto_category: Optional[str] = None
    volunteer_id: Optional[str] = None
    report_source: Optional[str] = None
    assigned_ngo_id: Optional[str] = None
    assigned_ngo_name: Optional[str] = None
    photo_url: Optional[str] = None
    photo_public_id: Optional[str] = None
    audio_url: Optional[str] = None
    audio_public_id: Optional[str] = None
    media_attachments: Optional[List[dict]] = []
    
    # Legacy fields (for backward compatibility)
    location: Optional[str] = None
    issue_type: Optional[str] = None

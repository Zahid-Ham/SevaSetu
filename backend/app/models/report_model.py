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
    primary_category: Optional[str] = None
    sub_category: Optional[str] = None
    problem_status: Optional[str] = None
    duration_of_problem: Optional[str] = None
    urgency_level: Optional[str] = None
    service_status: Optional[str] = None

    # Impact
    severity_score: Optional[int] = None
    population_affected: Optional[int] = None
    vulnerability_flag: Optional[str] = None
    secondary_impact: Optional[str] = None

    # Qualitative
    key_complaints: Optional[List[str]] = None
    sentiment: Optional[str] = None
    key_quote: Optional[str] = None
    description: Optional[str] = None
    
    # System Data
    auto_category: Optional[str] = None
    volunteer_id: Optional[str] = None
    report_source: Optional[str] = None
    photo_url: Optional[str] = None
    audio_url: Optional[str] = None
    
    # Legacy fields (for backward compatibility)
    location: Optional[str] = None
    issue_type: Optional[str] = None

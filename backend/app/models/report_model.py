from pydantic import BaseModel # type: ignore

class ReportCreate(BaseModel):
    citizen_name: str
    phone: str
    location: str
    issue_type: str
    description: str
    volunteer_id: str

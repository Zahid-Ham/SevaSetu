"""
prediction_routes.py
All API endpoints for the Event Prediction & Volunteer Auto-Assignment feature.
"""

from fastapi import APIRouter, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore
from typing import Optional, List
import datetime
from firebase_admin import firestore # Added missing import

from app.services import prediction_service, assignment_service, event_firestore_service
from app.services.firestore_service import get_all_reports

router = APIRouter()


# ─────────────────────────────────────────────
#  Request / Response Models
# ─────────────────────────────────────────────

class GeneratePredictionsRequest(BaseModel):
    area: str = "Maharashtra"
    month: Optional[str] = None


class ConfirmPredictionPayload(BaseModel):
    predicted_date_start: Optional[str] = None
    predicted_date_end: Optional[str] = None
    estimated_headcount: Optional[int] = None
    event_type: Optional[str] = None # Added for upsert
    area: Optional[str] = None      # Added for upsert
    category: Optional[str] = None # Added for upsert
    description: Optional[str] = None # Added for upsert
    required_skills: Optional[List[str]] = None # Added for upsert

class ConfirmPredictionRequest(BaseModel):
    event_id: str


class AssignmentRespondRequest(BaseModel):
    status: str   # "accepted" | "declined"


class VolunteerProfileRequest(BaseModel):
    volunteer_id: str
    name: str
    skills: List[str] = []
    area: str = ""
    available_dates: List[str] = []
    is_available: bool = True
    fatigue_score: int = 0


class FeedbackRequest(BaseModel):
    event_id: str
    volunteer_id: Optional[str] = None
    coordinator_id: Optional[str] = None
    assignment_quality_rating: int   # 1-5
    comment: Optional[str] = ""


class OverrideAssignmentRequest(BaseModel):
    new_volunteer_id: str
    new_volunteer_name: str


# ── Mock Predictions for Hydration ───────────────────
MOCK_PREDICTIONS = [
    {
        "event_type": "Clean Water Camp",
        "category": "Water",
        "description": "Seasonal water scarcity and 3 recent community complaints indicate high demand for a distribution camp.",
        "predicted_date_start": "2026-04-10",
        "predicted_date_end": "2026-04-13",
        "estimated_headcount": 18,
        "required_skills": ["logistics", "driving", "crowd_management"],
        "confidence_score": 0.91,
        "confidence_reason": "Strong seasonal pattern + 4 recent water complaints.",
        "area": "Pune, Maharashtra",
        "suggested_govt_scheme": "Jal Jeevan Mission",
        "tier": "high",
        "status": "predicted"
    },
    {
        "event_type": "Health Screening Camp",
        "category": "Health",
        "description": "Rising respiratory issues signal a preventive health camp. surge in this period annually.",
        "predicted_date_start": "2026-04-15",
        "predicted_date_end": "2026-04-18",
        "estimated_headcount": 25,
        "required_skills": ["first_aid", "medical", "counseling"],
        "confidence_score": 0.87,
        "confidence_reason": "Recurring annual health pattern.",
        "area": "Nashik, Maharashtra",
        "suggested_govt_scheme": "Ayushman Bharat",
        "tier": "high",
        "status": "predicted"
    }
]

# ─────────────────────────────────────────────
#  PREDICTION ENDPOINTS
# ─────────────────────────────────────────────

@router.post("/predictions/generate")
async def generate_predictions(body: GeneratePredictionsRequest):
    """
    Triggers the AI prediction engine.
    Fetches historical reports from Firestore, builds a summary,
    sends it to Gemini, saves the predictions, and returns them.
    """
    try:
        # Pull historical data
        historical_reports = get_all_reports()
        historical_summary = prediction_service.build_historical_summary(historical_reports)

        # Generate predictions
        predictions = prediction_service.generate_event_predictions(
            historical_summary=historical_summary,
            area=body.area,
            month=body.month,
        )

        # Save each prediction to Firestore
        saved = []
        for pred in predictions:
            pred_id = event_firestore_service.save_predicted_event(pred)
            pred["id"] = pred_id
            saved.append(pred)

        return {"success": True, "predictions": saved, "count": len(saved)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predictions/seed")
async def seed_predictions():
    """
    Seeds the initial mock predictions into Firestore to provide baseline data.
    """
    try:
        saved = []
        for pred in MOCK_PREDICTIONS:
            # Check if it already exists to avoid duplicates (by title and area)
            existing = event_firestore_service.get_all_predicted_events()
            exists = any(e['event_type'] == pred['event_type'] and e['area'] == pred['area'] for e in existing)
            
            if not exists:
                pred_id = event_firestore_service.save_predicted_event(pred)
                pred["id"] = pred_id
                saved.append(pred)
        
        return {"success": True, "predictions": saved, "count": len(saved)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions")
async def list_predictions():
    """Returns all predicted events sorted by creation date."""
    try:
        events = event_firestore_service.get_all_predicted_events()
        return {"success": True, "predictions": events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions/{event_id}")
async def get_prediction(event_id: str):
    """Returns a single predicted event by ID."""
    event = event_firestore_service.get_predicted_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return {"success": True, "prediction": event}


@router.post("/predictions/{event_id}/confirm")
async def confirm_prediction(event_id: str, body: ConfirmPredictionPayload = ConfirmPredictionPayload()):
    """
    Coordinator confirms a predicted event, optionally overriding dates and headcount.
    Automatically runs the assignment engine and creates assignments.
    Sends in-app notifications to assigned volunteers.
    """
    event = event_firestore_service.get_predicted_event(event_id)
    
    if not event:
        # If not in DB, it might be a Mock Prediction from the frontend.
        # We need the metadata to create it.
        if not body.event_type:
             raise HTTPException(status_code=404, detail="Prediction not found and no metadata provided to create it.")
        
        new_event = {
            "event_type": body.event_type,
            "area": body.area or "Maharashtra",
            "category": body.category or "General",
            "description": body.description or "AI Predicted Event",
            "predicted_date_start": body.predicted_date_start or datetime.datetime.now().strftime("%Y-%m-%d"),
            "predicted_date_end": body.predicted_date_end or datetime.datetime.now().strftime("%Y-%m-%d"),
            "estimated_headcount": body.estimated_headcount or 10,
            "required_skills": body.required_skills or [],
            "status": "predicted"
        }
        # Save it first
        event_id = event_firestore_service.save_predicted_event(new_event)
        event = event_firestore_service.get_predicted_event(event_id)

    # Apply manual overrides if provided
    updates = {}
    if body.predicted_date_start:
        updates["predicted_date_start"] = body.predicted_date_start
        event["predicted_date_start"] = body.predicted_date_start
    if body.predicted_date_end:
        updates["predicted_date_end"] = body.predicted_date_end
        event["predicted_date_end"] = body.predicted_date_end
    if body.estimated_headcount:
        updates["estimated_headcount"] = body.estimated_headcount
        event["estimated_headcount"] = body.estimated_headcount
        
    if updates:
        event_firestore_service.update_predicted_event(event_id, updates)

    # Mark as confirmed
    event_firestore_service.confirm_predicted_event(event_id)
    event["id"] = event_id
    event["status"] = "confirmed"

    # Fetch all volunteer profiles
    volunteers = event_firestore_service.get_all_volunteer_profiles()

    if not volunteers:
        return {
            "success": True,
            "message": "Event confirmed. No volunteer profiles found yet.",
            "assignments": [],
        }

    # Run auto-assignment
    ranked = assignment_service.run_auto_assignment(
        event=event,
        all_volunteers=volunteers,
        top_n=event.get("estimated_headcount", 10),
    )

    # BULK DISPATCH: Atomic batch write for speed
    created_assignments = event_firestore_service.bulk_dispatch_assignments(
        event_id=event_id,
        ranked_volunteers=ranked,
        event_ref=event
    )

    return {
        "success": True,
        "message": f"Event confirmed. {len(created_assignments)} volunteers assigned via atomic dispatch.",
        "assignments": created_assignments,
    }


@router.post("/predictions/{prediction_id}/dismiss")
async def dismiss_prediction_route(prediction_id: str):
    """Dismisses a predicted event (removes from active forecast)."""
    try:
        event_firestore_service.dismiss_predicted_event(prediction_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/predictions/{prediction_id}")
async def delete_prediction_route(prediction_id: str):
    """Permanently deletes a predicted event."""
    try:
        event_firestore_service.delete_predicted_event(prediction_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predictions/{prediction_id}/stop")
async def stop_event_route(prediction_id: str):
    """Stops a confirmed/live event."""
    try:
        event_firestore_service.stop_predicted_event(prediction_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
#  ASSIGNMENT ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/assignments/event/{event_id}")
async def get_assignments_for_event(event_id: str):
    """Returns all volunteer assignments for a specific event."""
    try:
        assignments = event_firestore_service.get_assignments_for_event(event_id)
        return {"success": True, "assignments": assignments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assignments/volunteer/{volunteer_id}")
async def get_assignments_for_volunteer(volunteer_id: str):
    """Returns all assignments for a specific volunteer (all statuses)."""
    try:
        assignments = event_firestore_service.get_assignments_for_volunteer(volunteer_id)
        return {"success": True, "assignments": assignments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assignments/{assignment_id}/respond")
async def respond_to_assignment(assignment_id: str, body: AssignmentRespondRequest):
    """
    Volunteer accepts or declines an assignment.
    On decline: triggers fallback assignment automatically.
    """
    if body.status not in ("accepted", "declined"):
        raise HTTPException(status_code=400, detail="status must be 'accepted' or 'declined'")

    assignment = event_firestore_service.get_assignment(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    event_firestore_service.respond_to_assignment(assignment_id, body.status)

    result = {"success": True, "status": body.status}

    if body.status == "declined":
        # Trigger fallback
        event = event_firestore_service.get_predicted_event(assignment["event_id"])
        if event:
            all_volunteers = event_firestore_service.get_all_volunteer_profiles()
            # Get declined volunteer IDs for this event
            existing = event_firestore_service.get_assignments_for_event(assignment["event_id"])
            declined_ids = [a["volunteer_id"] for a in existing if a.get("status") == "declined"]

            fallback = assignment_service.run_fallback_assignment(
                event=event,
                all_volunteers=all_volunteers,
                declined_volunteer_ids=declined_ids,
                top_n=1,
            )

            if fallback:
                fb = fallback[0]
                fb["is_fallback"] = True
                fb_id = event_firestore_service.create_assignment(fb)

                skills_label = assignment_service.skills_matched_label(
                    fb["volunteer_skills"],
                    event.get("required_skills", []),
                )
                event_firestore_service.create_notification(
                    volunteer_id=fb["volunteer_id"],
                    notification_data={
                        "type": "fallback_assignment",
                        "title": f"Fallback Assignment: {event.get('event_type', 'Event')}",
                        "body": f"A slot opened for you — {skills_label} for {event.get('event_type')} on {event.get('predicted_date_start', 'TBD')}.",
                        "assignment_id": fb_id,
                        "event_id": assignment["event_id"],
                    }
                )
                result["fallback_assigned"] = fb["volunteer_name"]

        # Reduce fatigue of declined volunteer
        if assignment.get("volunteer_id"):
            event_firestore_service.decrement_volunteer_fatigue(assignment["volunteer_id"])

    return result


@router.post("/assignments/{assignment_id}/override")
async def override_assignment(assignment_id: str, body: OverrideAssignmentRequest):
    """Coordinator manually swaps a volunteer in an assignment."""
    assignment = event_firestore_service.get_assignment(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    event_firestore_service.override_assignment(
        assignment_id, body.new_volunteer_id, body.new_volunteer_name
    )
    return {"success": True, "message": f"Assignment overridden to {body.new_volunteer_name}"}


# ─────────────────────────────────────────────
#  VOLUNTEER PROFILE ENDPOINTS
# ─────────────────────────────────────────────

@router.put("/volunteers/profile")
async def update_volunteer_profile(body: VolunteerProfileRequest):
    """Creates or updates a volunteer's profile (skills, area, availability)."""
    try:
        data = body.dict()
        volunteer_id = data.pop("volunteer_id")
        event_firestore_service.upsert_volunteer_profile(volunteer_id, data)
        return {"success": True, "message": "Profile updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/volunteers/profile/{volunteer_id}")
async def get_volunteer_profile(volunteer_id: str):
    """Returns a volunteer's profile. Returns null if not found (cleaner for demo)."""
    profile = event_firestore_service.get_volunteer_profile(volunteer_id)
    return {"success": True, "profile": profile}


@router.get("/volunteers/all")
async def list_volunteer_profiles():
    """Returns all volunteer profiles (for coordinator view)."""
    try:
        profiles = event_firestore_service.get_all_volunteer_profiles()
        return {"success": True, "volunteers": profiles, "count": len(profiles)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
#  IN-APP NOTIFICATIONS
# ─────────────────────────────────────────────

@router.get("/notifications/{volunteer_id}")
async def get_notifications(volunteer_id: str):
    """Returns all in-app notifications for a volunteer."""
    try:
        notifications = event_firestore_service.get_notifications_for_volunteer(volunteer_id)
        return {"success": True, "notifications": notifications}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Manual Event Creation ─────────────────────────────────────────────────────

class ManualEventRequest(BaseModel):
    event_type: str
    category: str
    description: str
    area: str
    predicted_date_start: str
    predicted_date_end: str
    estimated_headcount: int
    required_skills: list[str]
    suggested_govt_scheme: Optional[str] = "General"

@router.post("/events/manual")
async def manual_event(req: ManualEventRequest):
    """
    Creates an event manually and triggers auto-assignment.
    """
    try:
        # 1. Create the event document (Synchronous function)
        event_id = event_firestore_service.create_manual_event(req.dict())
        
        # 2. Get the event data back
        event = event_firestore_service.get_predicted_event(event_id)
        
        if not event:
            raise HTTPException(status_code=500, detail="Failed to retrieve created event")

        # 3. Trigger auto-assignment
        volunteers = event_firestore_service.get_all_volunteer_profiles()
        assignments = []
        if volunteers:
            assignments = assignment_service.run_auto_assignment(
                event=event, 
                all_volunteers=volunteers,
                top_n=event.get("estimated_headcount", 10)
            )
        
        # 4. Save assignments and notify
        for asgn in assignments:
            asgn_id = event_firestore_service.create_assignment(asgn)
            
            skills_label = assignment_service.skills_matched_label(
                asgn["volunteer_skills"],
                event.get("required_skills", []),
            )
            
            event_firestore_service.create_notification(
                volunteer_id=asgn["volunteer_id"],
                notification_data={
                    "type": "assignment",
                    "title": f"New Assignment: {event['event_type']}",
                    "body": f"You match {skills_label} for this manual event. View details in 'My Assignments'.",
                    "assignment_id": asgn_id,
                    "event_id": event_id
                }
            )

        return {
            "status": "success",
            "event_id": event_id,
            "assignments_count": len(assignments)
        }
    except Exception as e:
        print(f"[manual_event] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Marks a notification as read."""
    event_firestore_service.mark_notification_read(notification_id)
    return {"success": True}


# ─────────────────────────────────────────────
#  FEEDBACK
# ─────────────────────────────────────────────

@router.post("/events/feedback")
async def submit_feedback(body: FeedbackRequest):
    """Submits post-event feedback from a volunteer or coordinator."""
    try:
        feedback_id = event_firestore_service.save_feedback(body.dict())
        return {"success": True, "feedback_id": feedback_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
class JoinLiveMatchRequest(BaseModel):
    event_id: str
    volunteer_id: str
    status: str  # 'accepted' or 'declined'
    match_score: Optional[float] = 0.0
    score_breakdown: Optional[dict] = {}

@router.get("/volunteers/all")
async def get_all_volunteers_route():
    """Returns all volunteer profiles for supervisor dashboard."""
    try:
        profiles = event_firestore_service.get_all_volunteer_profiles()
        return {"success": True, "volunteers": profiles}
    except Exception as e:
        print(f"[get_all_volunteers] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/live/matching/{volunteer_id}")
async def get_live_matches_for_volunteer(volunteer_id: str):
    """
    Real-time matching: scores a volunteer against ALL confirmed live events.
    Returns matches with full score breakdown and human-readable AI reasoning.
    Relaxed filter: at least 1 skill overlap OR date overlap qualifies.
    Skipping events the volunteer has already responded to.
    """
    try:
        volunteer = event_firestore_service.get_volunteer_profile(volunteer_id)
        if not volunteer:
            return {"success": True, "matches": [], "message": "No volunteer profile found."}

        # Check existing assignments for this volunteer to avoid duplicates
        existing_assignments = event_firestore_service.get_assignments_for_volunteer(volunteer_id)
        responded_event_ids = {a.get("event_id") for a in existing_assignments}

        all_events = event_firestore_service.get_all_predicted_events()
        live_events = [e for e in all_events if e.get("status") == "confirmed" and e.get("id") not in responded_event_ids]

        if not live_events:
            return {"success": True, "matches": [], "message": "No new live events matching your profile currently."}

        matches = []
        volunteer_skills = volunteer.get("skills", [])
        volunteer_area = volunteer.get("area", "")

        for event in live_events:
            required_skills = event.get("required_skills", [])
            event_start = event.get("predicted_date_start", "")
            event_end = event.get("predicted_date_end", "")
            event_area = event.get("area", "")

            score, breakdown = assignment_service._score_volunteer(
                volunteer=volunteer,
                required_skills=required_skills,
                event_area=event_area.lower(),
                event_start=event_start,
                event_end=event_end,
            )

            matched_skills = [s for s in required_skills if s in volunteer_skills]
            avail_pct = breakdown.get("availability_pct", 0)
            skill_pct = breakdown.get("skill_match_pct", 0)

            # At least 1 skill OR date overlap — show it
            if len(matched_skills) == 0 and avail_pct <= 0:
                continue

            # Build AI reasoning string
            ai_reasoning = assignment_service.generate_ai_reasoning(
                score=score,
                breakdown=breakdown,
                required_skills=required_skills,
                volunteer_skills=volunteer_skills,
                event_start=event_start,
                event_end=event_end,
                event_area=event_area,
                volunteer_area=volunteer_area,
                volunteer_fatigue=volunteer.get("fatigue_score", 0)
            )

            matches.append({
                "event_id": event.get("id", ""),
                "event_type": event.get("event_type", ""),
                "event_date_start": event_start,
                "event_date_end": event_end,
                "event_required_skills": required_skills,
                "area": event_area,
                "category": event.get("category", ""),
                "estimated_headcount": event.get("estimated_headcount", 0),
                "accepted_count": event.get("accepted_count", 0),
                "volunteer_id": volunteer_id,
                "volunteer_name": volunteer.get("name", ""),
                "volunteer_skills": volunteer_skills,
                "volunteer_area": volunteer_area,
                "matched_skills": matched_skills,
                "match_score": round(score, 3),
                "score_breakdown": breakdown,
                "ai_reasoning": ai_reasoning,
                "is_live_match": True,
            })

        matches.sort(key=lambda x: x["match_score"], reverse=True)
        return {"success": True, "matches": matches, "count": len(matches)}

    except Exception as e:
        print(f"[live_matching] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/events/live/join")
async def join_live_match_route(body: JoinLiveMatchRequest):
    """
    Creates an assignment record when a volunteer responds to a live match card.
    """
    try:
        volunteer = event_firestore_service.get_volunteer_profile(body.volunteer_id)
        event = event_firestore_service.get_predicted_event(body.event_id)
        
        if not volunteer or not event:
            raise HTTPException(status_code=404, detail="Volunteer or Event not found")

        # Create assignment
        assignment_data = {
            "event_id": body.event_id,
            "volunteer_id": body.volunteer_id,
            "volunteer_name": volunteer.get("name", "Unknown"),
            "volunteer_skills": volunteer.get("skills", []), # Added for data integrity
            "volunteer_area": volunteer.get("area", ""),     # Added for data integrity
            "event_type": event.get("event_type", "Event"),
            "event_date_start": event.get("predicted_date_start"),
            "event_date_end": event.get("predicted_date_end"),
            "status": body.status,
            "match_score": body.match_score or 0.0, 
            "score_breakdown": body.score_breakdown or {},
            "is_live_match": True,
            "responded_at": firestore.SERVER_TIMESTAMP if body.status != 'pending' else None
        }
        
        assignment_id = event_firestore_service.create_assignment(assignment_data)
        
        # Manually update status to what was requested (since create_assignment defaults to 'pending')
        event_firestore_service.respond_to_assignment(assignment_id, body.status)
        
        # If accepted, trigger fatigue and analytics (normally handled in respondToAssignment)
        if body.status == 'accepted':
            event_firestore_service.increment_volunteer_fatigue(body.volunteer_id)
        
        return {"success": True, "assignment_id": assignment_id}
        
    except Exception as e:
        print(f"[join_live_match] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


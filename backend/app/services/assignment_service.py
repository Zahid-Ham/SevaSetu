"""
assignment_service.py
Volunteer matching algorithm — scores and ranks volunteers for a predicted/confirmed event.
Scoring: skill_match (40%) + availability (30%) + area_match (20%) + fatigue_buffer (10%)
"""

from typing import Optional
from datetime import datetime


# ─────────────────────────────────────────────
#  Scoring constants
# ─────────────────────────────────────────────

WEIGHT_SKILL    = 0.40
WEIGHT_AVAIL    = 0.30
WEIGHT_AREA     = 0.20
WEIGHT_FATIGUE  = 0.10

MAX_FATIGUE_SCORE = 5   # Above this → volunteer is "fatigued" and penalised


# ─────────────────────────────────────────────
#  Main public interface
# ─────────────────────────────────────────────

def run_auto_assignment(
    event: dict,
    all_volunteers: list[dict],
    top_n: int = 10,
) -> list[dict]:
    """
    Scores all eligible volunteers for an event and returns the top N ranked list.

    Args:
        event: The confirmed predicted_event dict from Firestore
        all_volunteers: List of volunteer_profile dicts from Firestore
        top_n: How many top volunteers to return

    Returns:
        List of assignment dicts (ready to be saved to Firestore)
    """
    scored = []

    required_skills: list[str] = event.get("required_skills", [])
    event_area: str = event.get("area", "").lower()
    event_start: str = event.get("predicted_date_start", "")
    event_end: str = event.get("predicted_date_end", "")

    for volunteer in all_volunteers:
        if not volunteer.get("is_available", True):
            continue  # Skip explicitly unavailable volunteers

        score, breakdown = _score_volunteer(
            volunteer=volunteer,
            required_skills=required_skills,
            event_area=event_area,
            event_start=event_start,
            event_end=event_end,
        )

        # RELAXED FILTERS: 
        # Only skip if they have NO matching skills AND NO matching dates.
        # This ensures we fill the target headcount (e.g. 40) with the best available hands.
        has_skill_match = not required_skills or (breakdown.get("skill_match_pct", 0) > 0)
        has_date_match = (breakdown.get("availability_pct", 0) > 0)

        if not has_skill_match and not has_date_match:
            continue

        scored.append({
            "volunteer_id": volunteer.get("id", volunteer.get("volunteer_id", "")),
            "volunteer_name": volunteer.get("name", "Unknown"),
            "volunteer_skills": volunteer.get("skills", []),
            "volunteer_area": volunteer.get("area", ""),
            "match_score": round(score, 3),
            "score_breakdown": breakdown,
            "event_id": event.get("id", ""),
            "event_type": event.get("event_type", ""),
            "event_date_start": event_start,
            "event_date_end": event_end,
            "event_required_skills": required_skills,  # Added to payload
            "status": "pending",
            "is_fallback": False,
        })

    # Sort by match score descending
    scored.sort(key=lambda x: x["match_score"], reverse=True)

    return scored[:top_n]


def run_fallback_assignment(
    event: dict,
    all_volunteers: list[dict],
    declined_volunteer_ids: list[str],
    top_n: int = 5,
) -> list[dict]:
    """
    Re-runs assignment excluding declined volunteers — 2nd tier fallback.
    """
    remaining = [v for v in all_volunteers
                 if v.get("id", v.get("volunteer_id", "")) not in declined_volunteer_ids]
    return run_auto_assignment(event, remaining, top_n=top_n)


# ─────────────────────────────────────────────
#  Internal scoring logic
# ─────────────────────────────────────────────

def _score_volunteer(
    volunteer: dict,
    required_skills: list[str],
    event_area: str,
    event_start: str,
    event_end: str,
) -> tuple[float, dict]:

    skill_score  = _skill_match(volunteer.get("skills", []), required_skills)
    avail_score  = _availability_match(volunteer, event_start, event_end)
    area_score   = _area_match(volunteer.get("area", ""), event_area)
    fatigue_score = _fatigue_buffer(volunteer.get("fatigue_score", 0))

    total = (
        skill_score  * WEIGHT_SKILL  +
        avail_score  * WEIGHT_AVAIL  +
        area_score   * WEIGHT_AREA   +
        fatigue_score * WEIGHT_FATIGUE
    )

    breakdown = {
        "skill_match_pct"   : round(skill_score * 100, 1),
        "availability_pct"  : round(avail_score * 100, 1),
        "area_match_pct"    : round(area_score * 100, 1),
        "fatigue_buffer_pct": round(fatigue_score * 100, 1),
    }

    return total, breakdown


def _skill_match(volunteer_skills: list[str], required_skills: list[str]) -> float:
    """Fraction of required skills the volunteer has."""
    if not required_skills:
        return 1.0
    matches = sum(1 for s in required_skills if s in volunteer_skills)
    return matches / len(required_skills)


def _availability_match(volunteer: dict, event_start: str, event_end: str) -> float:
    """
    Checks if the volunteer's marked available dates overlap with event dates.
    Returns 1.0 if available, 0.5 if unknown, 0.0 if unavailable.
    """
    available_dates: list[str] = volunteer.get("available_dates", [])

    if not available_dates:
        return 0.5  # Unknown — partial credit

    if not event_start:
        return 0.5

    try:
        start = datetime.strptime(event_start, "%Y-%m-%d").date()
        end = datetime.strptime(event_end, "%Y-%m-%d").date() if event_end else start

        # Check if any volunteer available date falls in the event window
        avail_date_objects = []
        for d in available_dates:
            try:
                avail_date_objects.append(datetime.strptime(d, "%Y-%m-%d").date())
            except Exception:
                pass

        if not avail_date_objects:
            return 0.5

        overlap = sum(1 for d in avail_date_objects if start <= d <= end)
        event_days = max((end - start).days + 1, 1)
        return min(overlap / event_days, 1.0)

    except Exception:
        return 0.5


def _area_match(volunteer_area: str, event_area: str) -> float:
    """Exact or partial area string match."""
    if not volunteer_area or not event_area:
        return 0.5
    vol = volunteer_area.lower().strip()
    evt = event_area.lower().strip()
    if vol == evt:
        return 1.0
    # Partial match (same city / district keyword)
    vol_words = set(vol.split())
    evt_words = set(evt.split())
    common = vol_words & evt_words
    if common:
        return 0.7
    return 0.2


def _fatigue_buffer(fatigue_score: int) -> float:
    """
    Inverted — lower fatigue = higher score.
    Volunteers with fatigue >= MAX_FATIGUE_SCORE receive 0.0.
    """
    if fatigue_score >= MAX_FATIGUE_SCORE:
        return 0.0
    return 1.0 - (fatigue_score / MAX_FATIGUE_SCORE)


# ─────────────────────────────────────────────
#  Skill matching summary for notification text
# ─────────────────────────────────────────────

def skills_matched_label(volunteer_skills: list[str], required_skills: list[str]) -> str:
    """Returns e.g. '3/5 required skills matched'"""
    if not required_skills:
        return "All skills match"
    matches = sum(1 for s in required_skills if s in volunteer_skills)
    return f"{matches}/{len(required_skills)} required skills"

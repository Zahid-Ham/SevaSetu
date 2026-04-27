from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks # type: ignore
from pydantic import BaseModel # type: ignore
from typing import Optional, List
from app.services import event_firestore_service, gemini_service
from app.services.certificate_service import check_and_award_badges, check_and_issue_certificates # type: ignore

router = APIRouter()

class TaskCreatePayload(BaseModel):
    description: str
    proof_required: bool = False

class TaskUpdatePayload(BaseModel):
    status: str
    proof_url: Optional[str] = None

@router.post("/tasks/{assignment_id}")
async def add_task(assignment_id: str, payload: TaskCreatePayload):
    """Supervisor creates a specific task for an accepted assignment."""
    try:
        task_id = event_firestore_service.create_task(
            assignment_id=assignment_id,
            description=payload.description,
            proof_required=payload.proof_required
        )
        return {"success": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks/{assignment_id}")
async def get_tasks(assignment_id: str):
    """Volunteer or Supervisor fetches tasks for an assignment."""
    try:
        tasks = event_firestore_service.get_tasks_for_assignment(assignment_id)
        return {"success": True, "tasks": tasks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/tasks/{task_id}/complete")
async def submit_task(task_id: str, payload: TaskUpdatePayload):
    """Volunteer submits a task for review (or marks as completed if simple)."""
    try:
        # We now default to 'under_review' for everything that needs approval,
        # but the volunteer can pass 'under_review' as the status.
        # 1. Update basic status and proof URL
        event_firestore_service.update_task_status(
            task_id=task_id,
            status=payload.status,
            proof_url=payload.proof_url
        )

        # 2. Trigger Gemini Guard if proof exists
        if payload.proof_url:
            try:
                # Fetch task description first
                task = event_firestore_service.get_task(task_id)
                if task:
                    analysis = gemini_service.verify_task_proof(
                        payload.proof_url, 
                        task['description']
                    )
                    event_firestore_service.update_task_verification(task_id, analysis)
            except Exception as ai_err:
                print(f"Non-blocking AI verification error: {ai_err}")

        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/tasks/{task_id}/approve")
async def approve_task(task_id: str, background_tasks: BackgroundTasks):
    """Supervisor approves a task, marking it as completed."""
    try:
        event_firestore_service.update_task_status(
            task_id=task_id,
            status="completed"
        )
        
        # Recognition Hook
        try:
            task = event_firestore_service.get_task(task_id)
            if task and task.get('assigned_to'):
                v_id = task.get('assigned_to')
                print(f"[Task Routes] Triggering eligibility check for volunteer: {v_id}")
                background_tasks.add_task(check_and_award_badges, v_id)
                background_tasks.add_task(check_and_issue_certificates, v_id)
        except Exception as e:
            print(f"[Task Routes] Non-blocking recognition error: {e}")

        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/tasks/{task_id}/reject")
async def reject_task(task_id: str):
    """Supervisor rejects a task proof, requesting new evidence."""
    try:
        event_firestore_service.update_task_status(
            task_id=task_id,
            status="rejected"
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tasks/{task_id}/analyze")
async def analyze_task_proof(task_id: str):
    """Manually trigger or re-run Gemini Guard analysis on a task proof."""
    try:
        # 1. Fetch task to get proof_url and description
        task = event_firestore_service.get_task(task_id)
        if not task or not task.get('proof_url'):
            raise HTTPException(status_code=404, detail="Task or proof not found")
        
        # 2. Run analysis
        analysis = gemini_service.verify_task_proof(
            task['proof_url'], 
            task['description']
        )
        
        # 3. Save to Firestore
        event_firestore_service.update_task_verification(task_id, analysis)
        
        return {"success": True, "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

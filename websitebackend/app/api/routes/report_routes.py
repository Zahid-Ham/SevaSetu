from fastapi import APIRouter, HTTPException, Query, Body # type: ignore
from pydantic import BaseModel # type: ignore
from app.services.firebase_service import get_user_reports_cached, get_report_by_id
from app.services.memory_service import get_hybrid_context, build_qa_prompt
from app.services.gemini_service import client, MODEL_ID

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/")
async def list_reports(user_email: str = Query(..., description="User email to fetch reports for")):
    """
    Lists all generated survey reports for a user.
    """
    try:
        reports = get_user_reports_cached(user_email)
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

class MemoryQueryRequest(BaseModel):
    query: str
    user_email: str
    group_id: str | None = None
    group_label: str | None = None

@router.post("/memory/chat")
async def chat_with_memory(request: MemoryQueryRequest):
    print(f"\n[HTTP] CHAT REQUEST: '{request.query}' | Mode: {'Individual' if request.group_id else 'Global'}")
    """
    Search reports and chat with AI about the user's community history.
    Supports both Global and Individual (group) modes.
    """
    try:
        # 1. Get relevant context from memory
        memories = get_hybrid_context(
            query=request.query,
            user_email=request.user_email,
            group_id=request.group_id,
            top_k=5
        )
        
        if not memories:
            # Fallback that still preserves the Context of the selected group!
            context_str = f"The user is focused on the issue group: '{request.group_label}'." if request.group_label else "The user is viewing their global community history."
            prompt = f"""
            You are the SevaSetu AI Assistant. {context_str}
            
            USER QUESTION: "{request.query}"
            
            INSTRUCTIONS:
            1. Focus your answer strictly on the context provided ({request.group_label or 'global history'}).
            2. If you don't have specific reports in context, admit it, but stay on the topic of the user's current view.
            3. Do NOT give general essays about community service. Be specific and helpful.
            """
        else:
            # 2. Build the RAG (Retrieval Augmented Generation) prompt
            prompt = build_qa_prompt(
                query=request.query,
                memories=memories,
                group_label=request.group_label
            )

        # 3. Call Gemini
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt
        )
        
        # 4. Extract unique attachments from retrieved memories
        attachments = []
        seen_files = set() # Check name + clean url
        
        for m in memories:
            report_attachments = m["report"].get("attachments", [])
            if not report_attachments:
                continue
                
            for att in report_attachments:
                name = att.get("name", "Document")
                url = att.get("url")
                if not url: continue
                
                # Smart URL Fingerprint: Use the basename to ignore versioning/tokens
                # Example: .../v12345/pothole.jpg?token=abc -> pothole.jpg
                clean_path = url.split('?')[0] # Remove query string
                file_id = clean_path.split('/')[-1].lower() # Get unique basename
                
                # Combined key: Name + Baseline ID
                dedupe_key = f"{name.lower()}_{file_id}"
                
                if dedupe_key not in seen_files:
                    attachments.append({
                        "name": name,
                        "url": url,
                        "mime": att.get("mime_type", "application/octet-stream"),
                        "report_id": m["report"].get("id")
                    })
                    seen_files.add(dedupe_key)

        return {
            "answer": response.text.strip(),
            "sources": [m["report"].get("executive_summary") for m in memories],
            "report_ids": [m["report"].get("id") for m in memories],
            "attachments": attachments
        }
    except Exception as e:
        print(f"Memory chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import cloudinary.api
from datetime import datetime
import os
import time
import requests as http_requests
from dotenv import load_dotenv

from app.config.firebase_config import db # type: ignore
from firebase_admin import firestore
from app.services.chat_websocket_manager import manager as ws_manager # type: ignore
from app.services.chat_analysis_service import (
    analyze_chat, 
    build_chat_chunks, 
    embed_and_store_chunks, 
    semantic_search
)
from app.services.chat_report_service import generate_chat_report_pdf
from app.services.attachment_intelligence_service import analyze_attachment_on_upload # type: ignore

load_dotenv()

# Try to import cloudinary — if not installed, upload endpoint returns a clear error
try:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.utils
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )
    CLOUDINARY_AVAILABLE = True
    print("[Chat Routes] Cloudinary configured successfully.")
except ImportError:
    CLOUDINARY_AVAILABLE = False
    print("[Chat Routes] WARNING: cloudinary package not installed. PDF uploads will be unavailable.")

router = APIRouter()

@router.get("/chat/serve-file")
async def serve_file(
    public_id: str, 
    transformation: str = None, 
    extension: str = None,
    r_type: Optional[str] = None
):
    """
    SERVER-SIDE PROXY: Downloads a file stored in Cloudinary and streams it to the client.
    Supports Cloudinary Transformations (e.g., t=so_0 for video thumbnails).
    """
    if not CLOUDINARY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Cloudinary SDK not available")

    # CLEANUP: Remove version prefix if passed (e.g. v1782374/path/to/file -> path/to/file)
    # Cloudinary URLs include a 'v' followed by numbers as a cache-buster/version.
    import re
    if re.match(r"^v[0-9]+/", public_id):
        new_public_id = re.sub(r"^v[0-9]+/", "", public_id)
        print(f"[Serve File] Stripped version prefix: {public_id} -> {new_public_id}")
        public_id = new_public_id

    print(f"[Serve File] Request for public_id={public_id}, t={transformation}, ext={extension}")
    
    # Determine media type based on extension or override
    import mimetypes
    target_path = f"{public_id}.{extension}" if extension else public_id
    media_type, _ = mimetypes.guess_type(target_path)
    
    if not media_type:
        if target_path.lower().endswith('.pdf'):
            media_type = "application/pdf"
        elif target_path.lower().endswith(('.mp4', '.mov')):
            media_type = "video/mp4"
        elif target_path.lower().endswith(('.m4a', '.mp3', '.wav')):
            media_type = "audio/mpeg"
        elif target_path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            media_type = "image/jpeg"
        else:
            # Fallback for m4a which mimetypes often misses
            if extension and extension.lower() == 'm4a':
                media_type = "audio/mp4"
            else:
                media_type = "application/octet-stream"

    # Try provided r_type hint first, then fallback to loop
    last_error = None
    resource_types = [r_type] if r_type else (["video", "raw", "image"] if extension in ['m4a', 'mp3', 'wav', 'mp4', 'mov'] else ["image", "raw", "video"])
    
    for current_rtype in resource_types:
        try:
            # private_download_url hits api.cloudinary.com (not the blocked CDN res.cloudinary.com)
            download_url = cloudinary.utils.private_download_url(
                public_id,
                extension,              # Extension override (convert video to jpg)
                resource_type=current_rtype,
                type="upload",
                expires_at=int(time.time()) + 3600, # 1 hour expiry
                attachment=False,
                transformation=transformation,      # Apply transformation (e.g. so_0)
            )

            print(f"[Serve File] Trying r_type={current_rtype} → {download_url[:100]}...")
            resp = http_requests.get(download_url, stream=True, timeout=60)
            
            if resp.status_code == 200:
                file_ext = extension or public_id.split(".")[-1]
                filename = f"{public_id.split('/')[-1]}.{file_ext}"

                def make_streamer(response):
                    def _stream():
                        for chunk in response.iter_content(chunk_size=16384): 
                            yield chunk
                    return _stream

                return StreamingResponse(
                    make_streamer(resp)(),
                    media_type=media_type,
                    headers={
                        "Content-Disposition": f'inline; filename="{filename}"',
                        "Cache-Control": "public, max-age=3600",
                        "Access-Control-Allow-Origin": "*",
                    }
                )
            else:
                body = resp.text[:200]
                last_error = f"HTTP {resp.status_code}: {body}"
                continue

        except Exception as e:
            last_error = str(e)
            continue

    raise HTTPException(
        status_code=404,
        detail=f"Could not fetch media. Last error: {last_error}"
    )

# Keep old signed-url endpoint for backward compatibility but it's no longer used
@router.get("/chat/get-signed-url")
async def get_signed_url(public_id: str, version: Optional[str] = None, extension: Optional[str] = None):
    """Deprecated: Use /chat/serve-file instead. Returns a signed URL (may still fail on untrusted accounts)."""
    if not CLOUDINARY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Cloudinary SDK not available")
    for r_type in ["image", "raw"]:
        try:
            options = {"resource_type": r_type, "sign_url": True, "expires_at": int(time.time()) + 3600, "secure": True}
            if version: options["version"] = version
            if extension: options["format"] = extension
            url = cloudinary.utils.cloudinary_url(public_id, **options)[0]
            return {"url": url}
        except Exception:
            continue
    raise HTTPException(status_code=500, detail="Could not generate signed URL")

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

class ChatMessage(BaseModel):
    role: str  # 'volunteer' | 'supervisor' | 'system'
    content: str
    timestamp: Optional[str] = None

class SummarizeChatRequest(BaseModel):
    room_id: Optional[str] = None
    messages: List[ChatMessage]
    context_event: Optional[str] = None

@router.post("/chat/summarize")
async def summarize_chat(req: SummarizeChatRequest, background_tasks: BackgroundTasks):
    """
    Uses Gemini to summarize a conversation between a supervisor and a volunteer.
    Provides 'Key Takeaways' and 'Action Items'.
    """
    if not req.messages:
        return {"summary": "No conversation history to summarize."}

    # Format conversation for the prompt
    conversation_text = ""
    for msg in req.messages:
        role_label = "Supervisor" if msg.role == "supervisor" else "Volunteer" if msg.role == "volunteer" else "System"
        conversation_text += f"{role_label}: {msg.content}\n"

    event_context = f"regarding the event '{req.context_event}'" if req.context_event else ""

    prompt = f"""
You are an expert NGO coordinator assistant for SevaSetu. 
Your task is to summarize the following conversation between a Supervisor and a Volunteer {event_context}.

CONVERSATION:
{conversation_text}

Provide a concise summary in the following format:
1. **Status**: (e.g. Agreement reached, Pending clarification, Declined)
2. **Key Takeaways**: (2-3 bullet points of what was discussed)
3. **Action Items**: (What needs to happen next)

Keep it professional and brief.
"""

    try:
        print(f"\n--- [Gemini Summary] Generating for event: {req.context_event} ---")
        print(f"[Gemini Summary] Prompt Length: {len(prompt)} chars")
        
        response = model.generate_content(prompt)
        summary_text = response.text.strip()
        
        print(f"[Gemini Summary] SUCCESS. Response Length: {len(summary_text)} chars")
        
        # ── Trigger Background Embedding ──
        # This ensures the 'Ask AI' context stays fresh when we summarize.
        room_id = req.room_id or "unknown"
        room_doc = db.collection("chats").document(room_id).get()
        room_data = room_doc.to_dict() if room_doc.exists else {}
        v_name = room_data.get("volunteer_name", "Volunteer")
        s_name = room_data.get("supervisor_name", "Supervisor")
        
        chunks = build_chat_chunks([m.dict() for m in req.messages], v_name, s_name)
        background_tasks.add_task(embed_and_store_chunks, room_id, chunks)
        
        return {"success": True, "summary": summary_text}
    except Exception as e:
        print(f"\n!!! [Gemini Summary ERROR] !!!")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Detail: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Summarization failed: {str(e)}")

# ── File Upload (Signed — for PDFs and documents) ───────────────────────────

@router.post("/chat/upload-file")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Uploads a file (PDF, image) to Cloudinary using a SIGNED upload.
    Signed uploads allow setting access_mode=public, which is required
    to make raw files (PDFs) publicly accessible on free Cloudinary accounts.
    The frontend cannot do this directly because unsigned uploads don't allow access_mode.
    """
    if not CLOUDINARY_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Cloudinary SDK not installed on server. Run: pip install cloudinary"
        )
    try:
        file_bytes = await file.read()
        
        result = cloudinary.uploader.upload(
            file_bytes,
            resource_type="raw",     # PDFs must be 'raw' for admin API download to work
            folder="sevasetu/chat",
            use_filename=True,
            unique_filename=True,
            overwrite=False,
            filename_override=file.filename,
        )
        
        # ── Trigger Background Analysis (Upload-Time Processing) ──
        # We use a sanitized public_id as the lookup key for the summary
        file_id = result["public_id"].replace("/", "_")
        background_tasks.add_task(
            analyze_attachment_on_upload, 
            file_bytes, 
            file.content_type or "application/pdf", 
            file.filename, 
            file_id
        )

        return {
            "success": True,
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "resource_type": result["resource_type"],
            "version": str(result.get("version", "")),
            "format": result.get("format", ""),
            "bytes": result.get("bytes", 0),
        }
    except Exception as e:
        print(f"[Upload File Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Message Handling ────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    volunteer_id: str
    supervisor_id: str
    event_id: Optional[str] = None
    sender_id: str
    text: str
    volunteer_name: Optional[str] = None
    supervisor_name: Optional[str] = None
    event_name: Optional[str] = None
    type: str = "text" # text | image | pdf | video | event_attachment
    metadata: Optional[dict] = None
    # Media fields for file sharing
    file_url: Optional[str] = None
    file_type: Optional[str] = None  # e.g. 'image/jpeg', 'application/pdf'
    file_name: Optional[str] = None  # original filename
    file_size: Optional[int] = None  # bytes
    file_public_id: Optional[str] = None # Cloudinary public ID
    file_version: Optional[str] = None   # Cloudinary version (v...)
    file_extension: Optional[str] = None # Cloudinary format (pdf, jpg...)

def get_room_id(v_id: str, s_id: str, e_id: Optional[str]) -> str:
    # Deterministic room ID based on participants and event context
    participants = sorted([v_id, s_id])
    base = f"{participants[0]}_{participants[1]}"
    if e_id:
        return f"{base}_{e_id}"
    return base

@router.post("/chat/send")
async def send_message(req: SendMessageRequest):
    """
    Saves a message to Firestore under a specific room.
    Ensures the room entry exists with metadata.
    On send, auto-marks the room as read for the sender.
    """
    room_id = get_room_id(req.volunteer_id, req.supervisor_id, req.event_id)
    
    msg_data = {
        "sender_id": req.sender_id,
        "text": req.text,
        "type": req.type,
        "timestamp": firestore.SERVER_TIMESTAMP,
        "deleted": False,
        "deleted_by": [],
    }
    # Include media fields if present
    if req.file_url:
        msg_data["file_url"] = req.file_url
    if req.file_type:
        msg_data["file_type"] = req.file_type
    if req.file_name:
        msg_data["file_name"] = req.file_name
    if req.file_size:
        msg_data["file_size"] = req.file_size
    if req.file_public_id:
        msg_data["file_public_id"] = req.file_public_id
    if req.file_version:
        msg_data["file_version"] = req.file_version
    if req.file_extension:
        msg_data["file_extension"] = req.file_extension
    if req.metadata:
        msg_data["metadata"] = req.metadata

    # 1. Update/Create Room Metadata
    room_ref = db.collection("chats").document(room_id)
    room_meta = {
        "volunteer_id": req.volunteer_id,
        "supervisor_id": req.supervisor_id,
        "event_id": req.event_id,
        # Show a meaningful last_message preview for media
        "last_message": (
            "📷 Image" if req.type == "image"
            else "📄 Document" if req.type == "pdf"
            else "🎥 Video" if req.type == "video"
            else req.text
        ),
        "last_sender_id": req.sender_id,
        "updated_at": firestore.SERVER_TIMESTAMP,
        "participants": [req.volunteer_id, req.supervisor_id],
        # Auto-mark sender as having read up to now
        f"last_read_by.{req.sender_id}": firestore.SERVER_TIMESTAMP,
    }
    
    # 1.1 Increment UNREAD count for the RECEIVER
    # We identify who is NOT the sender
    receiver_id = req.supervisor_id if req.sender_id == req.volunteer_id else req.volunteer_id
    room_meta[f"unread_counts.{receiver_id}"] = firestore.Increment(1)

    if req.volunteer_name:
        room_meta["volunteer_name"] = req.volunteer_name
    if req.supervisor_name:
        room_meta["supervisor_name"] = req.supervisor_name
    if req.event_name:
        room_meta["event_name"] = req.event_name

    # 🎯 CRITICAL: Update the room document with the latest message preview and timestamp
    # This is what handles sorting in the chat list!
    room_ref.set(room_meta, merge=True)

    # 1.2 Send REAL-TIME NOTIFICATION via WebSocket
    # This prevents the receiver from having to poll!
    # We include partial data for immediate UI update
    notification_data = {
        **msg_data,
        "room_id": room_id,
        "sender_id": req.sender_id,
        "id": "temp_" + str(int(time.time())),
        "timestamp": datetime.now().isoformat()
    }
    await ws_manager.notify_receiver(receiver_id, notification_data)

    # 2. Add Message to subcollection (PERMANENT STORAGE)
    doc_ref = room_ref.collection("messages").add(msg_data)
    message_id = doc_ref[1].id # doc_ref is tuple: (Timestamp, DocumentReference)
    
    return {"success": True, "room_id": room_id, "message_id": message_id}

@router.post("/chat/read/{room_id}")
async def mark_room_read(room_id: str, user_id: str):
    """
    Marks all messages in a room as read for the given user.
    Uses firestore.SERVER_TIMESTAMP to ensure native type consistency.
    """
    try:
        room_ref = db.collection("chats").document(room_id)
        room_ref.set({
            "last_read_by": {
                user_id: firestore.SERVER_TIMESTAMP
            },
            "unread_counts": {
                user_id: 0
            }
        }, merge=True)
        return {"success": True}
    except Exception as e:
        print(f"[Chat Read Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/chat/messages/{room_id}/{message_id}")
async def delete_message(room_id: str, message_id: str, mode: str = "for_me", user_id: str = ""):
    """
    Deletes a message.
    mode=for_everyone: Sets deleted=True, clears text (replaces with placeholder). Visible to all.
    mode=for_me: Adds user_id to deleted_by list. Message hidden only for that user.
    🎯 NEW: Automatically wipes associated Cloudinary media if no longer accessible by ANY participant.
    """
    try:
        room_ref = db.collection("chats").document(room_id)
        msg_ref = room_ref.collection("messages").document(message_id)
        
        msg_snap = msg_ref.get()
        if not msg_snap.exists:
            raise HTTPException(status_code=404, detail="Message not found.")
        
        msg_data = msg_snap.to_dict()
        file_pid = msg_data.get("file_public_id")
        file_type = msg_data.get("file_type", "") # e.g. 'image/jpeg'
        msg_type = msg_data.get("type", "text")    # e.g. 'image', 'pdf', 'video'
        
        should_purge_cloudinary = False
        updated_deleted_by = msg_data.get("deleted_by", [])

        if mode == "for_everyone":
            msg_ref.update({
                "deleted": True,
                "text": "This message was deleted",
                "deleted_by": [],  # Clear individual deletions since it's now gone for all
                # Optionally clear media fields in Firestore to "forget" the asset
                "file_url": firestore.DELETE_FIELD,
                "file_public_id": firestore.DELETE_FIELD,
            })
            should_purge_cloudinary = True if file_pid else False
            print(f"[Chat Delete] Mode: for_everyone. Flagging Cloudinary purge for {file_pid}")

        elif mode == "for_me" and user_id:
            if user_id not in updated_deleted_by:
                updated_deleted_by.append(user_id)
                msg_ref.update({
                    "deleted_by": firestore.ArrayUnion([user_id])
                })
            
            # Check if purge is needed (everyone has deleted)
            room_snap = room_ref.get()
            if room_snap.exists:
                participants = room_snap.to_dict().get("participants", [])
                # If all current participants have deleted the message
                if participants and all(p in updated_deleted_by for p in participants):
                    should_purge_cloudinary = True if file_pid else False
                    print(f"[Chat Delete] All participants ({participants}) deleted. Flagging Cloudinary purge.")
        else:
            raise HTTPException(status_code=400, detail="Invalid delete mode or missing user_id.")

        # ── PERFORM CLOUDINARY PURGE ──
        if should_purge_cloudinary and file_pid and CLOUDINARY_AVAILABLE:
            try:
                # 1. Determine most likely resource_type
                rtype = "raw"
                if "image" in file_type or msg_type == "image":
                    rtype = "image"
                elif "video" in file_type or msg_type == "video":
                    rtype = "video"
                
                print(f"[Chat Cleanup] Destroying: {file_pid} (Type: {rtype})")
                cloudinary.uploader.destroy(file_pid, resource_type=rtype)
            except Exception as ce:
                print(f"[Chat Cleanup] Error purging {file_pid}: {ce}")

        # ── BROADCAST DELETION ──
        # Notify all participants that this message is now deleted
        if mode == "for_everyone" or should_purge_cloudinary:
            room_snap = room_ref.get()
            if room_snap.exists:
                participants = room_snap.to_dict().get("participants", [])
                deletion_notice = {
                    "type": "message_deleted",
                    "room_id": room_id,
                    "message_id": message_id,
                    "mode": mode,
                    "deleted_by": updated_deleted_by,
                    "timestamp": datetime.now().isoformat()
                }
                for p_id in participants:
                    await ws_manager.notify_receiver(p_id, deletion_notice)

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Chat Delete Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/messages/{room_id}")
async def get_messages(
    room_id: str, 
    limit: int = 50, 
    user_id: str = "", 
    since: Optional[str] = None
):
    """
    Fetches latest messages for a given room.
    Supports delta fetching via 'since' (timestamp string).
    Filters out messages deleted for the requesting user.
    """
    try:
        from datetime import datetime
        messages_ref = db.collection("chats").document(room_id).collection("messages")
        
        query = messages_ref.order_by("timestamp", direction=firestore.Query.DESCENDING)
        
        if since:
            try:
                since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
                query = query.where("timestamp", ">", since_dt)
            except Exception as e:
                print(f"[Get Messages] Invalid since timestamp: {since} | {e}")

        docs = query.limit(limit).stream()
        
        msgs = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            if d.get("timestamp"):
                d["timestamp"] = d["timestamp"].isoformat()
            
            # Filter out messages deleted for this specific user
            deleted_by = d.get("deleted_by", [])
            if user_id and user_id in deleted_by:
                continue  # Skip this message for this user
                
            msgs.append(d)
            
        # Reverse to show chronological order in UI
        msgs.reverse()
        return {"success": True, "messages": msgs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/rooms/{user_id}")
async def get_user_rooms(user_id: str):
    """
    Lists all chat rooms for a specific user, sorted newest first.
    Computes unread_count by counting messages newer than last_read_by[user_id].
    """
    try:
        rooms_query = db.collection("chats").where("participants", "array_contains", user_id).stream()
        result = []
        for r in rooms_query:
            d = r.to_dict()
            d["id"] = r.id
            
            # ── Optimized Unread Check ──
            unread_counts = d.get("unread_counts", {})
            unread_count = unread_counts.get(user_id, 0)
            
            # Fallback for binary status
            if unread_count == 0:
                last_read_by = d.get("last_read_by", {})
                last_read_ts = last_read_by.get(user_id)
                updated_at_ts = d.get("updated_at")
                last_sender_id = d.get("last_sender_id")
                
                if last_sender_id != user_id and updated_at_ts:
                    # 🛡️ NORMALIZED COMPARISON: 
                    # Convert both to ISO strings for safe comparison (handles Datetime vs Str mismatch)
                    norm_updated = updated_at_ts.isoformat() if hasattr(updated_at_ts, 'isoformat') else str(updated_at_ts)
                    norm_last_read = last_read_ts.isoformat() if hasattr(last_read_ts, 'isoformat') else str(last_read_ts)
                    
                    if not last_read_ts or norm_updated > norm_last_read:
                        unread_count = 1
            
            # ── Safety for Serialization ──
            raw_updated = d.get("updated_at")
            if raw_updated:
                if hasattr(raw_updated, "isoformat"):
                    d["updated_at"] = raw_updated.isoformat()
                else:
                    d["updated_at"] = str(raw_updated)
            else:
                d["updated_at"] = ""

            d["unread_count"] = unread_count
            result.append(d)
        
        # Sort by updated_at descending
        result.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return {"success": True, "rooms": result}
    except Exception as e:
        print(f"[Rooms Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Chat Intelligence Endpoints ──────────────────────────────────────────

class AnalyzeChatRequest(BaseModel):
    room_id: str
    event_name: Optional[str] = ""
    fetch_limit: int = 200

@router.post("/chat/analyze")
async def analyze_chat_endpoint(req: AnalyzeChatRequest, background_tasks: BackgroundTasks):
    """
    Fetches chat history, generates deep analysis, and caches it.
    """
    try:
        # 1. Fetch messages
        messages_resp = await get_messages(req.room_id, limit=req.fetch_limit)
        messages = messages_resp.get("messages", [])
        
        if not messages:
            return {"success": False, "error": "No messages found to analyze."}

        # 2. Perform Analysis
        analysis = await analyze_chat(messages, req.event_name)
        
        # ── Trigger Background Embedding & Intelligence Backfill ──
        # 2. Re-embed in background to update "memory" for subsequent Q&A
        room_doc = db.collection("chats").document(req.room_id).get()
        room_data = room_doc.to_dict() if room_doc.exists else {}
        v_name = room_data.get("volunteer_name", "Volunteer")
        s_name = room_data.get("supervisor_name", "Supervisor")
        
        chunks = build_chat_chunks(messages, v_name, s_name)
        
        # Backfill document summaries into the chunks so Ask AI knows about them
        for insight in analysis.get("visual_insights", []):
            doc_chunk = f"[DOCUMENT SUMMARY: {insight.get('name')}] This {insight.get('type')} contains: {insight.get('summary')}"
            chunks.append(doc_chunk)
            
        background_tasks.add_task(embed_and_store_chunks, req.room_id, chunks)
        
        # 3. Cache Analysis in Firestore
        db.collection("chat_analysis").document(req.room_id).set(analysis)
        
        return {"success": True, "analysis": analysis}
    except Exception as e:
        print(f"\n!!! [Analyze Endpoint ERROR] !!!")
        print(f"Room ID: {req.room_id}")
        print(f"Error Detail: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/chat/report/{room_id}")
async def get_chat_report(room_id: str, event_name: str = ""):
    """
    Generates and returns a PDF report based on the cached analysis.
    """
    try:
        # 1. Get cached analysis
        doc = db.collection("chat_analysis").document(room_id).get()
        if not doc.exists:
            # If no analysis exists, trigger one now
            messages_resp = await get_messages(room_id, limit=200)
            messages = messages_resp.get("messages", [])
            analysis = await analyze_chat(messages, event_name)
            db.collection("chat_analysis").document(room_id).set(analysis)
        else:
            analysis = doc.to_dict()

        # 2. Generate PDF
        pdf_bytes = generate_chat_report_pdf(analysis, event_name, room_id)
        
        # 3. Stream Response
        from io import BytesIO
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="SevaSetu_Report_{room_id}.pdf"',
                "Cache-Control": "no-cache"
            }
        )
    except Exception as e:
        print(f"[Report Endpoint Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AskChatRequest(BaseModel):
    room_id: str
    question: str
    user_id: str
    event_name: Optional[str] = ""

@router.post("/chat/ask")
async def ask_chat_endpoint(req: AskChatRequest):
    """
    Semantic search Q&A over the chat history.
    """
    try:
        room_id = req.room_id
        
        # 1. Check if memory (chunks) exists
        mem_doc = db.collection("chat_memory").document(room_id).get()
        needs_re_embedding = True
        
        if mem_doc.exists:
            data = mem_doc.to_dict()
            last_emb = data.get("last_embedded_at")
            # If embedded in last 1 hour, reuse
            if last_emb:
                from datetime import datetime, timezone
                # last_emb is a datetime from firestore
                if (datetime.now(timezone.utc) - last_emb).total_seconds() < 3600:
                    needs_re_embedding = False
        
        if needs_re_embedding:
            print(f"[Ask AI] Re-embedding needed for room: {room_id}")
            # Fetch room meta to get proper names
            room_doc = db.collection("chats").document(room_id).get()
            room_data = room_doc.to_dict() if room_doc.exists else {}
            v_name = room_data.get("volunteer_name", "Volunteer")
            s_name = room_data.get("supervisor_name", "Supervisor")
            
            messages_resp = await get_messages(room_id, limit=500)
            messages = messages_resp.get("messages", [])
            chunks = build_chat_chunks(messages, v_name, s_name)
            embed_and_store_chunks(room_id, chunks)
            
        # 2. Semantic Search to get context
        context = semantic_search(room_id, req.question)
        
        # Diagnostic Log
        print(f"\n--- [Ask AI Engine] Final context for Gemini ---")
        print(f"Room ID: {room_id}")
        print(f"Question: {req.question}")
        print(f"Context Length: {len(context)} characters")
        if context:
            print(f"Context Sample: {context[:300]}...")
        else:
            print("!!! WARNING: CONTEXT IS EMPTY !!!")
        
        # 3. Call Gemini for final answer
        prompt = f"""
        You are 'SevaSetu AI helper'. Your goal is to answer questions about a specific conversation 
        between an NGO supervisor and a volunteer regarding '{req.event_name}'.
        
        Use the following relevant snippets from the chat history to answer the user's question accurately.
        If the answer isn't in the context, say you don't have enough information from the chat.
        
        CHAT CONTEXT:
        {context}
        
        QUESTION: {req.question}
        
        Answer professionally and concisely.
        """
        
        response = model.generate_content(prompt)
        answer = response.text.strip()
        
        # 4. Persistence: Save Q&A to Firestore under this room
        # We store it in a subcollection 'ai_interactions'
        interaction_ref = db.collection("chats").document(room_id).collection("ai_interactions").document()
        interaction_ref.set({
            "id": interaction_ref.id,
            "question": req.question,
            "answer": answer,
            "user_id": req.user_id,
            "timestamp": firestore.SERVER_TIMESTAMP,
            "context_used": True if context else False
        })
        
        return {
            "success": True, 
            "answer": answer, 
            "context_used": True if context else False
        }
    except Exception as e:
        print(f"\n!!! [Ask Endpoint ERROR] !!!")
        print(f"Room ID: {req.room_id}, Question: {req.question}")
        print(f"Error Detail: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ask AI failed: {str(e)}")

@router.get("/chat/ask/history/{room_id}")
async def get_ai_history(room_id: str):
    """
    Returns all previous Q&A interactions for a specific room.
    """
    try:
        interactions_ref = db.collection("chats").document(room_id).collection("ai_interactions")
        docs = interactions_ref.order_by("timestamp", direction=firestore.Query.ASCENDING).stream()
        
        history = []
        for doc in docs:
            d = doc.to_dict()
            if d.get("timestamp"):
                d["timestamp"] = d["timestamp"].isoformat()
            history.append(d)
            
        return {"success": True, "history": history}
    except Exception as e:
        print(f"[AI History Error] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch AI history: {str(e)}")# ── WebSocket Real-time Tunnel ──────────────────────────────────────────

from fastapi import WebSocket, WebSocketDisconnect

@router.websocket("/chat/ws/chat/{user_id}")
async def chat_websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    WebSocket tunnel for real-time chat updates.
    Allows the backend to PUSH messages to the frontend vs polling.
    """
    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            # We keep the connection alive but don't expect client input for now
            # (Clients send via RESTPOST /chat/send for robustness)
            data = await websocket.receive_text()
            # Handle heartbeat or client-to-server WS messages here if needed
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception as e:
        print(f"[WS ERROR] {e}")
        ws_manager.disconnect(user_id, websocket)

@router.delete("/chat/ask/history/{room_id}")
async def clear_ai_history(room_id: str):
    """
    Deletes all AI interactions for a specific room.
    """
    try:
        interactions_ref = db.collection("chats").document(room_id).collection("ai_interactions")
        docs = interactions_ref.stream()
        
        batch = db.batch()
        deleted_count = 0
        for doc in docs:
            batch.delete(doc.reference)
            deleted_count += 1
            
        if deleted_count > 0:
            batch.commit()
            
        return {"success": True, "deleted_count": deleted_count}
    except Exception as e:
        print(f"[Clear AI History Error] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear AI history: {str(e)}")

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import cloudinary.api
import os
import time
import requests as http_requests
from dotenv import load_dotenv

from app.config.firebase_config import db # type: ignore
from firebase_admin import firestore

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
    extension: str = None
):
    """
    SERVER-SIDE PROXY: Downloads a file stored in Cloudinary and streams it to the client.
    Supports Cloudinary Transformations (e.g., t=so_0 for video thumbnails).
    """
    if not CLOUDINARY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Cloudinary SDK not available")

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
            media_type = "application/octet-stream"

    # Try raw, image, then video (Resource types in Cloudinary)
    last_error = None
    for r_type in ["raw", "image", "video"]:
        try:
            # private_download_url hits api.cloudinary.com (not the blocked CDN res.cloudinary.com)
            download_url = cloudinary.utils.private_download_url(
                public_id,
                extension,              # Extension override (convert video to jpg)
                resource_type=r_type,
                type="upload",
                expires_at=int(time.time()) + 3600, # 1 hour expiry
                attachment=False,
                transformation=transformation,      # Apply transformation (e.g. so_0)
            )

            print(f"[Serve File] Trying r_type={r_type} → {download_url[:100]}...")
            resp = http_requests.get(download_url, stream=True, timeout=60)
            
            if resp.status_code == 200:
                print(f"[Serve File] SUCCESS with r_type={r_type}")
                filename = public_id.split("/")[-1]
                if extension:
                    filename = f"{filename}.{extension}"

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
model = genai.GenerativeModel('gemini-1.5-flash')

class ChatMessage(BaseModel):
    role: str  # 'volunteer' | 'supervisor' | 'system'
    content: str
    timestamp: Optional[str] = None

class SummarizeChatRequest(BaseModel):
    messages: List[ChatMessage]
    context_event: Optional[str] = None

@router.post("/chat/summarize")
async def summarize_chat(req: SummarizeChatRequest):
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
        response = model.generate_content(prompt)
        summary_text = response.text.strip()
        return {"success": True, "summary": summary_text}
    except Exception as e:
        print(f"[Chat Summary Error] {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI summary.")

# ── File Upload (Signed — for PDFs and documents) ───────────────────────────

@router.post("/chat/upload-file")
async def upload_file(file: UploadFile = File(...)):
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
    
    if req.volunteer_name:
        room_meta["volunteer_name"] = req.volunteer_name
    if req.supervisor_name:
        room_meta["supervisor_name"] = req.supervisor_name
    if req.event_name:
        room_meta["event_name"] = req.event_name

    room_ref.set(room_meta, merge=True)

    # 2. Add Message to subcollection
    room_ref.collection("messages").add(msg_data)

    return {"success": True, "room_id": room_id}

@router.post("/chat/read/{room_id}")
async def mark_room_read(room_id: str, user_id: str):
    """
    Marks all messages in a room as read for the given user.
    Updates last_read_by[user_id] to now.
    """
    try:
        room_ref = db.collection("chats").document(room_id)
        # Using .update() with a dot-notated key correctly updates 
        # a nested field without overwriting the entire map.
        room_ref.update({
            f"last_read_by.{user_id}": firestore.SERVER_TIMESTAMP
        })
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/chat/messages/{room_id}/{message_id}")
async def delete_message(room_id: str, message_id: str, mode: str = "for_me", user_id: str = ""):
    """
    Deletes a message.
    mode=for_everyone: Sets deleted=True, clears text (replaces with placeholder). Visible to all.
    mode=for_me: Adds user_id to deleted_by list. Message hidden only for that user.
    """
    try:
        msg_ref = db.collection("chats").document(room_id).collection("messages").document(message_id)
        msg_snap = msg_ref.get()
        
        if not msg_snap.exists:
            raise HTTPException(status_code=404, detail="Message not found.")

        if mode == "for_everyone":
            msg_ref.update({
                "deleted": True,
                "text": "This message was deleted",
                "deleted_by": [],  # Clear individual deletions since it's now gone for all
            })
        elif mode == "for_me" and user_id:
            msg_ref.update({
                "deleted_by": firestore.ArrayUnion([user_id])
            })
        else:
            raise HTTPException(status_code=400, detail="Invalid delete mode or missing user_id.")
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/messages/{room_id}")
async def get_messages(room_id: str, limit: int = 50, user_id: str = ""):
    """
    Fetches latest messages for a given room.
    Filters out messages deleted for the requesting user.
    """
    try:
        messages_ref = db.collection("chats").document(room_id).collection("messages")
        docs = messages_ref.order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
        
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
            # Instead of querying all messages (expensive), we use room metadata.
            # If the last message was from someone else AND was updated after we last read it.
            last_read_by = d.get("last_read_by", {})
            last_read_ts = last_read_by.get(user_id)
            updated_at_ts = d.get("updated_at") # This is still a datetime object here
            last_sender_id = d.get("last_sender_id")
            
            unread_count = 0
            if last_sender_id != user_id and updated_at_ts:
                # If we've never read it, or it was updated after our last read
                # Compare datetimes BEFORE converting them to strings/ISO format.
                if not last_read_ts or updated_at_ts > last_read_ts:
                    unread_count = 1
            
            # Now safe to convert to string for JSON serialization
            if d.get("updated_at"):
                d["updated_at"] = d["updated_at"].isoformat()

            d["unread_count"] = unread_count
            result.append(d)
        
        # Sort by updated_at descending (newest first)
        result.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        
        return {"success": True, "rooms": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

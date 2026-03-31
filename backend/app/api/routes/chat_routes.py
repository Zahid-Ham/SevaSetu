from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai
import os
from dotenv import load_dotenv

from app.config.firebase_config import db # type: ignore
from firebase_admin import firestore

load_dotenv()

router = APIRouter()

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
    type: str = "text" # text | event_attachment
    metadata: Optional[dict] = None

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
    if req.metadata:
        msg_data["metadata"] = req.metadata

    # 1. Update/Create Room Metadata
    room_ref = db.collection("chats").document(room_id)
    room_meta = {
        "volunteer_id": req.volunteer_id,
        "supervisor_id": req.supervisor_id,
        "event_id": req.event_id,
        "last_message": req.text,
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

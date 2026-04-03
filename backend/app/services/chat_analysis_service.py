import google.generativeai as genai
import os
import json
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.config.firebase_config import db
from firebase_admin import firestore

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

import time
import requests
import base64
import cloudinary # type: ignore
import cloudinary.utils # type: ignore
from app.services.gemini_service import process_document_and_extract, analyze_multimodal_attachment # type: ignore

print("\n" + "="*50)
print("[SYSTEM] MISSION AUDIT ENGINE v2.1 (CLOUDINARY BYPASS) ACTIVE")
print("="*50 + "\n")

# Configure Cloudinary for Signed URL Bypass
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# Using Flash for speed and cost-effectiveness in analysis
model = genai.GenerativeModel('gemini-2.5-flash') # Updated to gemini-2.5-flash per user request
embedding_model = "models/gemini-embedding-001"

def retry_with_backoff(func, *args, max_retries=5, initial_delay=1, **kwargs):
    """
    Executes a function with exponential backoff for rate limiting (429 errors).
    """
    retries = 0
    delay = initial_delay
    while retries < max_retries:
        try:
            return func(*args, **kwargs)
        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "resource exhausted" in err_str:
                print(f"!!! [Gemini API] Rate limit hit (429). Retrying in {delay}s... (Attempt {retries+1}/{max_retries})")
                time.sleep(delay)
                retries += 1
                delay *= 2 # Exponential backoff
            elif "503" in err_str or "overloaded" in err_str:
                print(f"!!! [Gemini API] Service overloaded (503). Retrying in {delay}s...")
                time.sleep(delay)
                retries += 1
                delay *= 2
            else:
                raise e
    return func(*args, **kwargs) # One last try

async def get_document_intelligence(file_url: str, mime_type: str, file_name: str, mission_name: str = "") -> str:
    """
    Uses Gemini Vision to 'read' the document and extract its purpose for the mission.
    Caches intelligence to avoid re-processing.
    """
    try:
        # Check cache (Simplified Firestore cache)
        cache_id = base64.b64encode(file_url.encode()).decode()[:64].replace("/", "_")
        cache_ref = db.collection("attachment_intelligence").document(cache_id)
        cached_doc = cache_ref.get()
        
        if cached_doc.exists:
            return cached_doc.to_dict().get("intelligence", "")

        print(f"[Intelligence] Processing new attachment: {file_name}")
        
        # Normalize MIME type for Gemini
        processed_mime = mime_type
        if mime_type == "image": processed_mime = "image/jpeg"
        if mime_type == "pdf": processed_mime = "application/pdf"

        # 1. Download file content
        print(f"[MISSION AUDIT] Fetching for {file_name}...")
        sanitized_url = file_url.replace(" ", "%20")
        
        try:
            response = requests.get(sanitized_url, timeout=15)
            # 1a. Handle Cloudinary 401/Unauthorized with Signature Bypass
            if response.status_code == 401 and "cloudinary.com" in sanitized_url:
                print(f"[Cloudinary Bypass] Unauthorized (401) detected. Generating signed URL for {file_name}...")
                
                # Extract public_id from URL: /upload/v12345/PATH/TO/FILE.ext
                try:
                    parts = sanitized_url.split("/upload/")
                    if len(parts) > 1:
                        # Skip version (v12345/) and get the rest
                        path_parts = parts[1].split("/", 1)
                        full_path = path_parts[1] if len(path_parts) > 1 else path_parts[0]
                        
                        # Remove extension for public_id and keep it for the format argument
                        ext_parts = full_path.rsplit(".", 1)
                        public_id = ext_parts[0]
                        extension = ext_parts[1] if len(ext_parts) > 1 else ""
                        
                        r_type = "raw" if "/raw/" in sanitized_url else "image"
                        
                        # Generate 1-minute signed URL - 'extension' is the required 'format' argument
                        authorized_url = cloudinary.utils.private_download_url(
                            public_id,
                            extension,
                            resource_type=r_type,
                            type="upload",
                            expires_at=int(time.time()) + 60
                        )
                        
                        print(f"[Cloudinary Bypass] Attempting fetch with signature...")
                        response = requests.get(authorized_url, timeout=15)
                        if response.status_code == 200:
                            print(f"[Cloudinary Bypass] SUCCESS for {file_name}!")
                except Exception as inner_e:
                    print(f"!!! [Cloudinary Bypass ERROR] Failed to sign {file_name}: {inner_e}")

            if response.status_code != 200:
                print(f"!!! [Intelligence ERROR] Fetch Failed | Code: {response.status_code} | URL: {sanitized_url[:100]}...")
                return f"Failed to access document content (HTTP {response.status_code})."
        except Exception as e:
            print(f"!!! [Intelligence ERROR] HTTP Request CRASH: {e}")
            return f"Network error during fetch: {str(e)}"

        # 2. Extract intelligence using native Gemini Multimodal analysis
        print(f"[MISSION AUDIT] Analysis Stage: Native Gemini Multimodal Audit for '{file_name}' (MIME: {processed_mime})...")
        result = analyze_multimodal_attachment(response.content, mime_type=processed_mime, mission_name=mission_name, file_name=file_name)
        
        summary = result.get("file_summary", "Summary unavailable.")
        relevance = result.get("relevance_explanation", "Relevance mapping unavailable.")
        
        intelligence = f"{summary} STRATEGIC RELEVANCE: {relevance}"
        print(f"[MISSION AUDIT] SUCCESS. Relevance Score: {result.get('relevance_score', 0)}/10")
        
        # 3. Cache it
        cache_ref.set({
            "intelligence": intelligence,
            "file_name": file_name,
            "processed_at": firestore.SERVER_TIMESTAMP
        })
        
        return intelligence
    except Exception as e:
        print(f"!!! [Intelligence ERROR] {file_name}: {e}")
        return f"Could not extract intelligence: {str(e)}"

def filter_messages(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filters out casual fluff (greetings, short acknowledgments) to focus on mission content.
    Always keeps messages with attachments.
    """
    fluff_words = {"hi", "hello", "hey", "ok", "okay", "thanks", "thank", "sure", "got it", "fine"}
    filtered = []
    for m in messages:
        text = m.get("text", "").lower().strip().strip("!?.")
        has_attachment = m.get("type") in ["image", "pdf", "video"]
        
        # Keep if it has an attachment or is more than 15 characters (likely meaningful)
        # and doesn't just contain a single fluff word.
        if has_attachment:
            filtered.append(m)
        elif len(text) > 15:
            filtered.append(m)
        elif text not in fluff_words and len(text) > 3:
            filtered.append(m)
            
    # Always keep at least some messages if filtering was too aggressive
    return filtered if len(filtered) > 0 else messages

async def analyze_chat(messages: List[Dict[str, Any]], event_name: str = "") -> Dict[str, Any]:
    """
    Performs a deep structured analysis of the chat history, focused on mission goals.
    """
    if not messages:
        return {"error": "No messages to analyze."}

    # Filter fluff to focus on mission
    mission_messages = filter_messages(messages)

    # 1. Gather Intelligence on all attachments
    intel_map = {}
    for m in mission_messages:
        m_type = m.get("type")
        file_url = m.get("file_url") or m.get("url") or m.get("content_url")
        
        if m_type in ["image", "pdf"] and file_url:
            file_name = m.get("file_name", "document")
            intel = await get_document_intelligence(file_url, m_type, file_name, event_name)
            intel_map[file_name] = intel

    # 2. Format conversation with real intelligence
    convo_text = ""
    for m in mission_messages:
        role = "Supervisor" if m.get("sender_id", "").startswith("sup") else "Volunteer"
        text = m.get("text", "")
        if m.get("type") in ["image", "pdf", "video"]:
            f_name = m.get("file_name", "media")
            intel_summary = intel_map.get(f_name)
            if not intel_summary:
                # Fallback check for keys that might match but have slight naming diffs
                intel_summary = "Contextual summary not available (Mission Audit skipped)."
            text = f"[{m.get('type').upper()} ATTACHMENT: {f_name}] Summary: {intel_summary}"
        convo_text += f"{role}: {text}\n"

    try:
        # 3. Main Analysis with Document Intelligence
        print(f"\n--- [Chat Analysis] Analyzing mission-critical data for: {event_name} ---")
        print(f"[Chat Analysis] Filtered messages: {len(mission_messages)} / {len(messages)}")
        
        # Inject the refined conversation into the prompt
        prompt = f"""
        You are an expert NGO coordinator for SevaSetu.
        Analyze the following conversation between a Supervisor and a Volunteer regarding the mission '{event_name}'.
        
        FOCUS AREAS: Event logistics, survey data, brainstorming, decision making, and mission objectives.
        IGNORE: General greetings, casual social talk, or personal pleasantries unless they impact the mission.

        CONVERSATION:
        {convo_text}
        
        Return a HIGHLY STRUCTURED JSON object with these fields:
        - executive_summary (string): 2-3 sentence overview of the MISSION progress and status.
        - visual_insights (array of objects): For every PDF or Image mentioned, provide:
            {{"name": "filename", "type": "pdf/image", "summary": "2-sentence intelligence extraction showing its relevance to the mission"}}
        - issues_discussed (array of strings): Specific mission-related problems or topics raised.
        - mission_context (string): Strategic alignment with '{event_name}'.
        - key_insights (array of strings): Critical observations about the work or planning quality.
        - volunteer_readiness (object): {{"status": "Ready" | "Needs Clarification" | "Not Ready", "reasoning": "Brief explanation why"}}
        - action_items (array of strings): Concrete mission-related next steps.
        - sentiment_breakdown (object): {{"supervisor": "...", "volunteer": "...", "overall": "..."}}
        - quality_score (number): 1-10 on mission-focused communication clarity.
        
        Return ONLY raw JSON. No markdown formatting.
        """

        response = retry_with_backoff(model.generate_content, prompt)
        text = response.text.strip()
        
        # Clean markdown if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        
        analysis = json.loads(text)

        # Ensure default keys for frontend stability
        defaults = {
            "executive_summary": "Analysis processing complete.",
            "visual_insights": [],
            "issues_discussed": [],
            "key_insights": [],
            "action_items": [],
            "volunteer_readiness": {"status": "Ready", "reasoning": "Communication is clear."},
            "quality_score": 5,
            "sentiment_breakdown": {"overall": "Neutral"}
        }
        for key, val in defaults.items():
            if key not in analysis:
                analysis[key] = val

        analysis["timestamp"] = datetime.utcnow().isoformat()
        
        print(f"[Chat Analysis] SUCCESS. Readiness: {analysis.get('volunteer_readiness', {}).get('status', 'N/A')}")
        return analysis
    except Exception as e:
        print(f"\n!!! [Chat Analysis ERROR] !!!")
        print(f"Error Detail: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": f"Failed to generate analysis: {str(e)}"}

def build_chat_chunks(
    messages: List[Dict[str, Any]], 
    volunteer_name: str = "Volunteer", 
    supervisor_name: str = "Supervisor",
    chunk_size: int = 15
) -> List[str]:
    """
    Groups messages into chunks for embedding. 
    Includes real names to help Gemini resolve 'who said what'.
    """
    chunks = []
    current_chunk = []
    
    for i, m in enumerate(messages):
        # Determine role shorthand
        role = "S" # Default
        if "role" in m:
            role = "S" if m["role"] == "supervisor" else "V"
        elif "sender_id" in m:
            role = "S" if m.get("sender_id", "").startswith("sup") else "V"
            
        role_label = f"Supervisor ({supervisor_name})" if role == "S" else f"Volunteer ({volunteer_name})"
        content = m.get("content") or m.get("text") or ""
        
        if m.get("type") in ["image", "pdf", "video"]:
            content = f"[{m.get('type').upper()} ATTACHMENT: {m.get('file_name', 'media')}]"
            
        current_chunk.append(f"{role_label}: {content}")
        
        if (i + 1) % chunk_size == 0 or i == len(messages) - 1:
            chunks.append("\n".join(current_chunk))
            current_chunk = []
            
    return chunks

def embed_and_store_chunks(room_id: str, chunks: List[str]):
    """
    Embeds each chunk sequentially using Gemini and saves to Firestore.
    Sequential processing is safer against SDK-specific batching bugs.
    """
    if not chunks:
        return

    try:
        print(f"\n--- [Gemini Embedding Engine] Processing {len(chunks)} chunks sequentially for room: {room_id} ---")
        
        batch = db.batch()
        chunks_collection = db.collection("chat_memory").document(room_id).collection("chunks")
        
        success_count = 0
        for i, text in enumerate(chunks):
            try:
                # Embed singular chunk with retry logic
                res = retry_with_backoff(
                    genai.embed_content,
                    model=embedding_model,
                    content=text,
                    task_type="retrieval_document"
                )
                
                # Extract values robustly
                raw_emb = getattr(res, "embedding", None) or res.get("embedding")
                if not raw_emb:
                    # Try plural as fallback
                    plural = getattr(res, "embeddings", None) or res.get("embeddings")
                    if plural and isinstance(plural, list):
                        raw_emb = plural[0]
                
                if not raw_emb:
                    print(f"!!! [Gemini Embedding] Chunk {i} FAILED: No embedding in response.")
                    continue
                
                # Convert to plain float list to avoid "Nested arrays" error
                if hasattr(raw_emb, "values"):
                    emb_list = [float(v) for v in raw_emb.values]
                else:
                    emb_list = [float(v) for v in raw_emb]
                
                doc_id = f"chunk_{i}"
                doc_ref = chunks_collection.document(doc_id)
                batch.set(doc_ref, {
                    "text": text,
                    "embedding": emb_list,
                    "updated_at": firestore.SERVER_TIMESTAMP
                })
                success_count += 1
                print(f"[Gemini Embedding] Chunk {i+1}/{len(chunks)} Success.")
            except Exception as inner_e:
                print(f"!!! [Gemini Embedding] Chunk {i} CRASHED: {inner_e}")

        # Update meta record for the room
        meta_ref = db.collection("chat_memory").document(room_id)
        batch.set(meta_ref, {
            "last_embedded_at": firestore.SERVER_TIMESTAMP,
            "chunk_count": success_count,
            "room_id": room_id
        }, merge=True)
        
        batch.commit()
        print(f"[Gemini Embedding] FINAL SUCCESS. {success_count} fragments saved to Firestore.")
        
    except Exception as e:
        print(f"!!! [Gemini Embedding Engine ERROR] !!!")
        print(f"Error Detail: {str(e)}")
        import traceback
        traceback.print_exc()

def cosine_similarity(a, b):
    a_arr = np.array(a)
    b_arr = np.array(b)
    return np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr))

def semantic_search(room_id: str, question: str, top_k: int = 5) -> str:
    """
    Retrieves most relevant chunks for a question.
    Returns a concatenated string of context.
    """
    try:
        # 1. Embed the question
        res = genai.embed_content(
            model=embedding_model,
            content=question,
            task_type="retrieval_query"
        )
        
        # Extract values robustly
        raw_emb = getattr(res, "embedding", None) or res.get("embedding")
        if not raw_emb:
            plural = getattr(res, "embeddings", None) or res.get("embeddings")
            if plural and isinstance(plural, list):
                raw_emb = plural[0]
                
        if not raw_emb:
            print("!!! [Semantic Search] Failed to embed question.")
            return ""
            
        # Convert to plain float list
        if hasattr(raw_emb, "values"):
            query_emb = [float(v) for v in raw_emb.values]
        else:
            query_emb = [float(v) for v in raw_emb]
        
        # 2. Fetch all chunks for this room
        chunks_docs = db.collection("chat_memory").document(room_id).collection("chunks").stream()
        
        scored_chunks = []
        for doc in chunks_docs:
            data = doc.to_dict()
            if "embedding" in data:
                sim = cosine_similarity(query_emb, data["embedding"])
                scored_chunks.append((sim, data["text"]))
            
        # 3. Sort and take top_k
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        
        # Diagnostic Log
        print(f"\n--- [Semantic Search] Top {top_k} results for question: '{question}' ---")
        for i, (score, text) in enumerate(scored_chunks[:top_k]):
            print(f"[Result {i+1}] Score: {score:.4f} | Preview: {text[:80]}...")
            
        relevant_texts = [text for score, text in scored_chunks[:top_k]]
        return "\n---\n".join(relevant_texts)
    except Exception as e:
        print(f"\n!!! [Semantic Search Error] !!!")
        print(f"Error Detail: {str(e)}")
        import traceback
        traceback.print_exc()
        return ""

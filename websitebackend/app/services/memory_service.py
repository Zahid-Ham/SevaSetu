import numpy as np
from datetime import datetime
from app.services.firebase_service import db, get_user_reports_cached, get_user_issues
from app.services.gemini_service import generate_embedding, get_report_context_string

def cosine_similarity(v1, v2):
    """Calculates cosine similarity between two vectors."""
    if not v1 or not v2: return 0.0
    v1, v2 = np.array(v1), np.array(v2)
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

# ── Memory Caching System (Rescue Layer) ────────────────
# Use the global cache from firebase_service to prevent 429 'Quota Exceeded'

def get_hybrid_context(user_email: str, query: str, group_id: str = None, group_label: str = None, top_k: int = 5):
    """
    Retrieves the most relevant memories (reports) using a combination of 
    Vector Similarity and Importance Scoring.
    """
    print(f"\n[MEMORY] Process Start | Mode: {'Individual' if group_id else 'Global'} | Query: '{query}'", flush=True)
    
    # 1. Generate query embedding
    try:
        print(f"[MEMORY] Generating Embedding for query...", flush=True)
        query_vec = generate_embedding(query)
        if not query_vec:
            print("[MEMORY] embedding returned None - returning empty context", flush=True)
            return []
    except Exception as e:
        print(f"[MEMORY WARN] Embedding service unavailable: {e}", flush=True)
        return []

    # 2. Fetch reports to search through (Now using Cache!)
    all_reports = get_user_reports_cached(user_email)
    print(f"[MEMORY] Memory Index contains {len(all_reports)} reports.", flush=True)
    
    if group_id:
        # INDIVIDUAL MODE: Identify reports belonging to this context
        issue_ref = db.collection("issues").document(group_id).get()
        if issue_ref.exists:
            issue_data = issue_ref.to_dict()
            report_ids = issue_data.get("reports", [])
            label = (group_label or issue_data.get("label", "")).lower()
            
            # Match by explicit ID OR by flexible keyword matching
            filtered_reports = []
            # Split label into keywords (pothole, shivaji, nagar, etc) for fuzzy matching
            # Filter out noise words like "survey", "problem", etc.
            noise_words = {"survey", "problem", "report", "issue", "initial", "final", "nagar", "ward"}
            keywords = [
                k.strip() for k in label.replace("(", "").replace(")", "").replace("-", " ").split() 
                if len(k.strip()) > 3 and k.strip() not in noise_words
            ]
            
            for r in all_reports:
                r_id = r.get("id")
                r_area = (r.get("area") or "").lower()
                r_summary = (r.get("executive_summary") or "").lower()
                r_cat = (r.get("primary_category") or "").lower()
                
                # Check for explicit ID link
                is_linked = r_id in report_ids
                
                # Check for keyword overlap (if report mentions 'pothole', 'road', 'drainage' etc)
                has_keyword_match = any(k in r_area or k in r_summary or k in r_cat for k in keywords)
                
                if is_linked or has_keyword_match:
                    filtered_reports.append(r)
            
            all_reports = filtered_reports
        else:
            # Fallback for unexpected missing issue doc: 
            # Filter all reports by the group label to preserve context
            if group_label:
                l = group_label.lower()
                all_reports = [r for r in all_reports if l in (r.get("area") or "").lower() or l in (r.get("executive_summary") or "").lower()]
            else:
                return []

    if not all_reports:
        return []

    # 3. Score and Rank Memories
    scored_memories = []
    now = datetime.utcnow()

    for r in all_reports:
        # A. Semantic Score (Vector Similarity)
        # Note: reports fetched from Firestore might not have embeddings in memory yet 
        # because the 'report' object is a child. We need the full doc.
        # Actually, get_user_reports should be updated to return embeddings.
        # Let's assume embeddings are part of the report list now.
        
        vec = r.get("embedding")
        sem_score = 0.0
        if vec and query_vec:
            sem_score = cosine_similarity(query_vec, vec)
        
        # B. Importance Score (Severity)
        # Severity is 1-10. Normalize to 0-1.
        sev = float(r.get("severity_score") or 5) / 10.0
        
        # C. Time Decay Score
        # e^(-lambda * days_since)
        created_at = r.get("created_at", "")
        days_old = 0
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                days_old = (now.replace(tzinfo=dt.tzinfo) - dt).days
            except: pass
        
        # Decay factor: halve importance every 30 days
        time_score = np.exp(-0.02 * days_old) 
        
        # FINAL HYBRID SCORE
        # 60% semantic, 20% severity, 20% recency
        final_score = (sem_score * 0.6) + (sev * 0.2) + (time_score * 0.2)
        
        # D. Group Boost (if Individual Mode)
        if group_id:
            # If we had a direct link from report -> issue_id, we'd boost here.
            # For now, we'll just return the ranked list.
            pass

        scored_memories.append({
            "report": r,
            "score": final_score,
            "context": get_report_context_string(r)
        })

    # 4. Sort and filter unique memories (Incident Fingerprinting)
    scored_memories.sort(key=lambda x: x["score"], reverse=True)
    
    unique_memories = []
    seen_fingerprints = set()
    
    for m in scored_memories:
        r = m["report"]
        # Email Subject Locking: The most reliable way to identify identical incident reports
        subject = (r.get("email_subject") or "").lower().strip()
        
        if subject:
            fingerprint = f"subject:{subject}"
        else:
            # Fallback for reports without subjects: Combine core fields
            fingerprint = f"data:{(r.get('citizen_name') or '').lower()}|{(r.get('primary_category') or '').lower()}|{(r.get('precise_location') or '').lower()}"
            
        # Only keep the highest scoring version of this specific incident
        if fingerprint not in seen_fingerprints:
            unique_memories.append(m)
            seen_fingerprints.add(fingerprint)
            
    print(f"[MEMORY] Final Analysis: Returning {len(unique_memories)} unique relevant reports.", flush=True)
    return unique_memories

def build_qa_prompt(query: str, memories: list, group_label: str = None) -> str:
    """Constructs the prompt for Gemini with injected memory context."""
    context_blocks = []
    for m in memories:
        r = m["report"]
        context_blocks.append(f"REPORT [{r.get('id')}]:\n{m['context']}")
    
    context_text = "\n\n".join(context_blocks)
    mode = f"individual group '{group_label}'" if group_label else "global history"
    
    return f"""
    You are the SevaSetu AI Assistant, a high-level investigator. 
    The user is asking questions about specific emails or reports they have received. 
    YOU HAVE FULL PERMISSION AND ACCESS to the following data, which corresponds exactly to those emails.
    
    --- DATA REPOSITORY (SOURCE OF TRUTH) ---
    {context_text}
    --- END DATA REPOSITORY ---
    
    USER QUESTION: "{query}"
    
    INSTRUCTIONS:
    1. EXPLICITLY IDENTIFY: The user mentions "an email" - use the data above to answer that request. 
    2. Be CRISP, DIRECT, and AUTHORITATIVE. Use bullet points.
    3. LIST EVIDENCE: Look for the 'ATTACHMENTS' section in the data above. If files are listed, YOU MUST list their names and types in your response.
    4. NO APOLOGIES: Never say "I don't have access to your emails." You DO have access to the data extracted from them in the context above.
    5. NO CITATIONS: Do not mention Report IDs (e.g., [Report 123]) in your natural language response.
    
    Your Definitive Response:
    """

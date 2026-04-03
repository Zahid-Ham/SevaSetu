import sys
import os
import time

# Add root to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.firebase_service import get_unindexed_reports, update_report_embedding
from app.services.gemini_service import generate_embedding, get_report_context_string

def run_migration():
    """
    Finds all reports in Firestore that don't have a vector embedding.
    Generates embeddings using Gemini and updates the documents.
    """
    print("[MIGRATION START] Finding unindexed reports...", flush=True)
    unindexed = get_unindexed_reports()
    
    if not unindexed:
        print("[MIGRATION] All reports are already indexed. No work to do!", flush=True)
        return

    count = len(unindexed)
    print(f"[MIGRATION] Found {count} unindexed reports. Processing...", flush=True)
    
    success = 0
    errors = 0
    
    for i, r in enumerate(unindexed, 1):
        try:
            # 1. Prepare text context
            # We treat 'report' as a dict because get_unindexed_reports returns docs from Firestore
            report_data = r.get("report", {})
            context = get_report_context_string(report_data)
            
            # 2. Generate vector
            print(f"[{i}/{count}] Embedding report {r['id']}...", flush=True)
            vector = generate_embedding(context)
            
            if vector:
                # 3. Update Firestore
                update_report_embedding(r["id"], vector)
                success += 1
            else:
                errors += 1
            
            # Quota management: text-embedding-004 has a generous limit but we'll be polite
            time.sleep(0.5)
            
        except Exception as e:
            print(f"[MIGRATION ERROR] Failed to process {r.get('id')}: {e}", flush=True)
            errors += 1

    print(f"""
[MIGRATION COMPLETE]
--------------------
Total processed: {count}
Success: {success}
Errors/Skips: {errors}
--------------------
You can now use Global & Individual context-aware AI Chat!
""", flush=True)

if __name__ == "__main__":
    run_migration()

from app.config.firebase_config import db # type: ignore
from firebase_admin import firestore # type: ignore

def get_previous_complaints_insights(primary_category: str, sub_category: str) -> str:
    """
    Queries Firestore to find historical data on similar complaints.
    Provides a text-based insight for the AI to include in the structured report.
    """
    try:
        # Query Firestore for reports within the same primary/sub category
        # Using 'community_reports' collection as seen in firestore_service.py
        collection_ref = db.collection("community_reports")
        
        # Simple query for exact matches on category and subcategory
        # Note: We are using a simple where filter here. 
        # In modern Firestore, you might need an index if you perform multiple where clauses, 
        # but for small scales or single fields it should be fine.
        query_ref = collection_ref.where("primary_category", "==", primary_category) \
                             .where("sub_category", "==", sub_category) \
                             .limit(20)
        
        docs = query_ref.stream()
        
        count = 0
        total_severity = 0
        resolved_count = 0
        
        for doc in docs:
            data = doc.to_dict()
            count += 1
            severity = data.get("severity_score")
            if isinstance(severity, (int, float)):
                total_severity += severity
            
            if data.get("problem_status") == "Resolved":
                resolved_count += 1
        
        if count == 0:
            return f"No previous records for {sub_category} under {primary_category} were found in the system yet."
        
        avg_severity = total_severity / count if count > 0 else 0
        insight = f"There have been {count} similar reports of {sub_category} recorded."
        
        if resolved_count > 0:
            insight += f" Notably, {resolved_count} of these have been successfully resolved."
        else:
            insight += " None of these similar reports have been marked as resolved yet."
            
        if avg_severity > 0:
            insight += f" The average severity level of these incidents is {avg_severity:.1f}/10."
            
        return insight
        
    except Exception as e:
        print(f"Error in get_previous_complaints_insights: {e}")
        # Return a fallback message so the app doesn't crash
        return "Historical data comparison is currently unavailable."

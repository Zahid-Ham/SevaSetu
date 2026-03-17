from app.config.firebase_config import db  # type: ignore
from firebase_admin import firestore  # type: ignore


def save_report(report_data: dict) -> str:
    """
    Saves structured report data to the 'community_reports' Firestore collection.
    Returns the generated document ID.
    """
    report_data['created_at'] = firestore.SERVER_TIMESTAMP
    collection_ref = db.collection("community_reports")
    update_time, doc_ref = collection_ref.add(report_data)
    print(f"Report saved to Firestore with ID: {doc_ref.id}")
    return doc_ref.id


def get_all_reports() -> list:
    """
    Fetches all reports from the 'community_reports' Firestore collection,
    ordered by creation time (newest first).
    Returns a list of report dictionaries.
    """
    collection_ref = db.collection("community_reports")
    docs = collection_ref.order_by("created_at", direction=firestore.Query.DESCENDING).stream()

    reports = []
    for doc in docs:
        data = doc.to_dict()
        # Convert Firestore timestamp to string for JSON serialisation
        if data.get("created_at"):
            try:
                data["created_at"] = data["created_at"].isoformat()
            except Exception:
                data["created_at"] = str(data["created_at"])
        data["id"] = doc.id
        reports.append(data)

    print(f"Fetched {len(reports)} reports from Firestore")
    return reports

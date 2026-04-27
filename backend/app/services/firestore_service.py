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


def delete_report(report_id: str) -> None:
    """
    Deletes a specific report from the 'community_reports' Firestore collection by its document ID.
    Raises ValueError if the document does not exist.
    """
    doc_ref = db.collection("community_reports").document(report_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise ValueError(f"Report with ID '{report_id}' not found.")
    doc_ref.delete()
    print(f"Report {report_id} deleted from Firestore.")


def update_document(collection_name: str, doc_id: str, data: dict) -> None:
    """
    Updates a document in any Firestore collection.
    """
    doc_ref = db.collection(collection_name).document(doc_id)
    doc_ref.update(data)
    print(f"Document {doc_id} in {collection_name} updated successfully.")

import base64
import re
import json
import requests  # type: ignore
from datetime import datetime, timedelta
import google.genai as genai  # type: ignore
from google.genai import types
from app.config.settings import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL_ID = 'gemini-2.5-flash'

GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

from app.services.cloudinary_service import upload_attachment



def _get_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}





def _extract_email_address(from_header: str) -> str:
    match = re.search(r'<([^>]+)>', from_header)
    if match:
        return match.group(1)
    if "@" in from_header:
        return from_header.strip()
    return from_header


def _parse_date(date_str: str) -> datetime:
    try:
        for fmt in [
            "%a, %d %b %Y %H:%M:%S %z",
            "%d %b %Y %H:%M:%S %z",
            "%a, %d %b %Y %H:%M:%S",
            "%d %b %Y %H:%M:%S",
        ]:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        clean = re.sub(r'\s*\([^)]*\)\s*$', '', date_str.strip())
        for fmt in ["%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S"]:
            try:
                return datetime.strptime(clean, fmt)
            except ValueError:
                continue
    except Exception:
        pass
    return datetime.min



from app.services.firebase_service import (
    get_user_issues,
    save_new_issue,
    append_email_to_issue,
    get_processed_email_ids,
    mark_email_as_processed
)


def _ai_classify_and_group(user_email: str, new_emails: list, existing_issues: list) -> None:
    """
    Use Gemini AI to classify unmapped emails and either append them to existing Firestore issues
    or create brand new issues.
    """
    if not new_emails:
        return

    # Build summaries for new emails
    email_summaries = []
    for i, email in enumerate(new_emails):
        email_summaries.append(f"[{i}] MSG_ID: {email['id']} | Subject: {email['subject']} | From: {email['from']} | Snippet: {email['snippet'][:150]}")

    emails_text = "\n".join(email_summaries)

    # Build summaries for existing issues context
    issue_summaries = []
    if existing_issues:
        for issue in existing_issues:
            issue_summaries.append(f"Issue ID: {issue['id']} | Label: {issue['label']} | Category: {issue['category']}")
    issues_text = "\n".join(issue_summaries) if issue_summaries else "None"

    prompt = f"""You are an intelligent email analyzer for a community service platform called SevaSetu.

TASK: Given these {len(new_emails)} new emails, do TWO things:

1. CLASSIFY each email into exactly ONE of three categories:
   - "Survey Reports": Data collection, survey findings, baseline/endline data, questionnaires, assessment results, census data, evaluation reports.
   - "Field Reports": On-ground activities, site visits, food/supply distribution, intervention updates, progress updates, severe cases, urgent interventions, community help requests, follow-up actions.
   - "Irrelevant": Personal emails, spam, newsletters, promotional emails, or anything NOT related to NGOs, community work, healthcare interventions, or SevaSetu operations.

2. GROUP valid emails (Survey/Field Reports). 
   - Check the "Existing Issues" list below. If the email belongs to an existing issue, return its `existing_issue_id`.
   - If the emails belong to a completely NEW topic, group them together by assigning them the same `new_issue_label` and setting `existing_issue_id` to null.
   
EXISTING ISSUES:
{issues_text}

NEW EMAILS:
{emails_text}

Respond with ONLY valid JSON:
{{
  "classifications": [
    {{
      "email_index": 0,
      "category": "Survey Reports" | "Field Reports" | "Irrelevant",
      "existing_issue_id": "issue_id_string_or_null",
      "new_issue_label": "Short descriptive label (only if existing_issue_id is null)"
    }}
  ]
}}

RULES:
- Every new email must appear exactly once.
- Use the email_index from the [i] prefix.
- If an email matches an Existing Issue, use its EXACT Issue ID.
- If creating a new issue, assign the same `new_issue_label` to related emails so they are grouped together.
"""

    try:
        print(f"[AI CLASSIFY START] Processing {len(new_emails)} new emails with {MODEL_ID}...", flush=True)
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type='application/json'
            )
        )
        text = response.text.strip()
        print(f"[AI CLASSIFY FINISH] Received {len(text)} characters of JSON classification data.", flush=True)
        if text.startswith("```json"):
            text = text[7:].rsplit("```", 1)[0]
        elif text.startswith("```"):
            text = text[3:].rsplit("```", 1)[0]

        result = json.loads(text.strip())
        classifications = result.get("classifications", [])
        
        # We need to track new issues created in this batch so if two emails in the same batch
        # create the same issue, they are grouped.
        batch_new_issues = {} # map label -> new_issue_id
        
        for c in classifications:
            idx = c.get("email_index", -1)
            if 0 <= idx < len(new_emails):
                category = c.get("category", "Irrelevant")
                if category == "Irrelevant":
                    mark_email_as_processed(new_emails[idx]["id"])
                    continue
                    
                email_data = new_emails[idx]
                existing_id = c.get("existing_issue_id")
                new_label = c.get("new_issue_label")
                
                if existing_id:
                    append_email_to_issue(existing_id, email_data)
                elif new_label:
                    if new_label in batch_new_issues:
                        append_email_to_issue(batch_new_issues[new_label], email_data)
                    else:
                        new_id = save_new_issue(user_email, new_label, category, email_data)
                        batch_new_issues[new_label] = new_id

    except Exception as e:
        print(f"AI classification error: {e}")
        # Fallback: ignore failures to avoid corrupting db

def _format_issues_for_ui(issues: list) -> dict:
    survey_reports = []
    field_reports = []
    
    for i in issues:
        group = {
            "group_id": i["id"],
            "label": i["label"],
            "emails": sorted(i.get("emails", []), key=lambda e: e.get("parsed_date", "")),
        }
        group["email_count"] = len(group["emails"])
        group["is_thread"] = group["email_count"] > 1
        
        if i["category"] == "Survey Reports":
            survey_reports.append(group)
        else:
            field_reports.append(group)
            
    # Sort by email count then label
    survey_reports.sort(key=lambda g: (-g["email_count"], g["label"]))
    field_reports.sort(key=lambda g: (-g["email_count"], g["label"]))
    
    return {
        "survey_reports": survey_reports,
        "field_reports": field_reports,
        "survey_count": len(survey_reports),
        "field_count": len(field_reports),
        "total_count": len(survey_reports) + len(field_reports)
    }


def list_survey_emails(
    access_token: str,
    user_email: str,
    allowed_senders: list[str] = None,
    max_results: int = 50,
    last_scan_time: int = None,
) -> dict:
    """
    Syncs new unread emails from Gmail against Firestore issues.
    """
    # 1. Fetch current database state
    existing_issues = get_user_issues(user_email)

    # 2. Fetch raw emails from Gmail
    if last_scan_time:
        # Subtract 300 seconds (5 mins) as a safety buffer to prevent missing mid-scan emails
        buffered_time = max(0, last_scan_time - 300)
        query = f"after:{buffered_time}"
        period = f"since {datetime.fromtimestamp(buffered_time).strftime('%H:%M:%S')} (with 5m buffer)"
    else:
        # Background scans use 2 days, while full scans use 7 (optimized for quota)
        days = 2 if max_results <= 50 else 7
        after_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y/%m/%d")
        query = f"after:{after_date}"
        period = f"last {days} days"

    print(f"[GMAIL SCAN START] Query: '{query}' ({period})", flush=True)
    url = f"{GMAIL_API_BASE}/messages"
    params = {"q": query, "maxResults": max_results}

    response = requests.get(url, headers=_get_headers(access_token), params=params)
    response.raise_for_status()
    messages = response.json().get("messages", [])
    print(f"[GMAIL SCAN FINISH] Found {len(messages)} messages.", flush=True)

    if not messages:
        res = _format_issues_for_ui(existing_issues)
        res["filters"] = {"allowed_senders": allowed_senders or [], "period": period}
        return res

    # 3. Find which emails are already stored in our database
    incoming_ids = [msg["id"] for msg in messages]
    processed_ids = get_processed_email_ids(incoming_ids)

    # 4. Filter unmapped emails
    new_emails = []
    for msg in messages:
        msg_id = msg["id"]
        if msg_id in processed_ids:
            continue
            
        email_data = get_email_metadata(access_token, msg_id)
        if not email_data:
            continue

        if allowed_senders and len(allowed_senders) > 0:
            sender_email = _extract_email_address(email_data["from"])
            if sender_email.lower() not in [s.lower() for s in allowed_senders]:
                print(f"[GMAIL SKIP] Email {msg_id} skipped: Sender '{sender_email}' is not in whitelist.")
                continue

        email_data["parsed_date"] = _parse_date(email_data["date"]).isoformat()
        new_emails.append(email_data)

    # 5. Classify new emails and update Firestore
    if new_emails:
        _ai_classify_and_group(user_email, new_emails, existing_issues)
        # Fetch updated set of issues
        existing_issues = get_user_issues(user_email)

    result = _format_issues_for_ui(existing_issues)
    result["filters"] = {"allowed_senders": allowed_senders or [], "period": "last 7 days"}
    return result


# ── Email fetching functions ──────────────────────────

def get_email_metadata(access_token: str, message_id: str) -> dict | None:
    url = f"{GMAIL_API_BASE}/messages/{message_id}"
    params = {"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]}
    response = requests.get(url, headers=_get_headers(access_token), params=params)
    response.raise_for_status()
    data = response.json()
    headers = {h["name"]: h["value"] for h in data.get("payload", {}).get("headers", [])}
    return {
        "id": message_id,
        "subject": headers.get("Subject", "No Subject"),
        "from": headers.get("From", "Unknown"),
        "date": headers.get("Date", ""),
        "snippet": data.get("snippet", ""),
        "has_attachments": _check_attachments(data.get("payload", {})),
    }


def _check_attachments(payload: dict) -> bool:
    for part in payload.get("parts", []):
        if part.get("filename"):
            return True
        if part.get("parts") and _check_attachments(part):
            return True
    return False


def get_email_full_content(access_token: str, message_id: str) -> dict:
    url = f"{GMAIL_API_BASE}/messages/{message_id}"
    params = {"format": "full"}
    response = requests.get(url, headers=_get_headers(access_token), params=params)
    response.raise_for_status()
    data = response.json()
    payload = data.get("payload", {})
    headers = {h["name"]: h["value"] for h in payload.get("headers", [])}
    return {
        "subject": headers.get("Subject", ""),
        "from": headers.get("From", ""),
        "date": headers.get("Date", ""),
        "body": _extract_body(payload),
        "attachments": _extract_attachments(access_token, message_id, payload),
    }


def get_multiple_emails_content(access_token: str, message_ids: list[str]) -> list[dict]:
    results = []
    for mid in message_ids:
        try:
            results.append(get_email_full_content(access_token, mid))
        except Exception as e:
            print(f"Error fetching email {mid}: {e}")
    results.sort(key=lambda e: _parse_date(e.get("date", "")).isoformat())
    return results


def _extract_body(payload: dict) -> str:
    body_text = ""
    mime_type = payload.get("mimeType", "")
    if mime_type == "text/plain":
        body_data = payload.get("body", {}).get("data", "")
        if body_data:
            body_text = base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")
    elif mime_type == "text/html" and not body_text:
        body_data = payload.get("body", {}).get("data", "")
        if body_data:
            html = base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")
            body_text = re.sub(r'<[^>]+>', ' ', html)
            body_text = re.sub(r'\s+', ' ', body_text).strip()
    for part in payload.get("parts", []):
        part_text = _extract_body(part)
        if part_text and not body_text:
            body_text = part_text
    return body_text


def _extract_attachments(access_token: str, message_id: str, payload: dict) -> list:
    attachments = []
    for part in payload.get("parts", []):
        filename = part.get("filename", "")
        mime_type = part.get("mimeType", "")
        if filename and part.get("body", {}).get("attachmentId"):
            att_id = part["body"]["attachmentId"]
            att_url = f"{GMAIL_API_BASE}/messages/{message_id}/attachments/{att_id}"
            att_resp = requests.get(att_url, headers=_get_headers(access_token))
            if att_resp.status_code == 200:
                raw = base64.urlsafe_b64decode(att_resp.json().get("data", ""))
                # Upload to Cloudinary immediately
                secure_url = upload_attachment(raw, filename, mime_type)
                if secure_url:
                    attachments.append({
                        "filename": filename, 
                        "mime_type": mime_type, 
                        "url": secure_url,
                        "data": raw # Keep raw bytes for this session's AI analysis
                    })
        if part.get("parts"):
            attachments.extend(_extract_attachments(access_token, message_id, part))
    return attachments

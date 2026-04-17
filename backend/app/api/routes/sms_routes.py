import os
from fastapi import APIRouter, Request, Response
from twilio.twiml.messaging_response import MessagingResponse
from app.services.sms_session import get_session, update_session, clear_session
from app.api.routes.bot_routes import submit_bot_report
from app.models.report_model import ReportCreate
from bot.services.geo_service import geocode_address
from bot.services.media_service import upload_telegram_media_to_cloudinary
from whatsapp.services.twilio_service import download_twilio_media

router = APIRouter()

CATEGORIES = [
    "Homeless Person Help",
    "Garbage & Sanitation",
    "Infrastructure Repair",
    "Electricity & Water",
    "Medical Emergency",
    "Other Issues"
]

@router.post("/sms/webhook")
async def sms_webhook(request: Request):
    """
    Main webhook for Twilio SMS incoming messages.
    Handles the conversational state machine for citizen reporting via plain SMS.
    """
    form_data = await request.form()
    incoming_msg = form_data.get("Body", "").strip()
    sender_phone = form_data.get("From", "") 
    num_media = int(form_data.get("NumMedia", "0"))
    
    session = get_session(sender_phone)
    step = session["step"]
    data = session["data"]
    
    twiml = MessagingResponse()

    if step == "START":
        welcome_text = (
            "Welcome to SevaSetu! Reply with the number of your issue:\n"
        )
        for i, cat in enumerate(CATEGORIES, 1):
            welcome_text += f"{i}. {cat}\n"
        
        twiml.message(welcome_text)
        update_session(sender_phone, step="CHOOSING_CATEGORY")

    elif step == "CHOOSING_CATEGORY":
        try:
            choice = int(incoming_msg) - 1
            if 0 <= choice < len(CATEGORIES):
                category = CATEGORIES[choice]
                update_session(sender_phone, step="DESCRIBING_ISSUE", data_update={"primary_category": category})
                twiml.message(f"Got it - {category}. Please type the location of the problem (address or landmark).")
            else:
                twiml.message("Invalid choice. Please reply with a number from 1 to 6.")
        except ValueError:
            twiml.message("Please send only the number corresponding to your choice.")

    elif step == "DESCRIBING_ISSUE":
        update_session(sender_phone, step="GETTING_LOCATION", data_update={"location": incoming_msg})
        twiml.message("Location saved. Now please provide a brief description of the problem.")

    elif step == "GETTING_LOCATION":
        # Try to geocode the location text for better data quality
        geo_result = geocode_address(data["location"])
        gps_coords = f"{geo_result['lat']},{geo_result['lon']}" if geo_result else None
        
        update_session(sender_phone, step="UPLOADING_MEDIA", data_update={
            "description": incoming_msg,
            "gps_coordinates": gps_coords
        })
        
        twiml.message(
            "Optionally, send a PHOTO of the issue now. \n"
            "To skip, reply SKIP."
        )

    elif step == "UPLOADING_MEDIA":
        if incoming_msg.upper() == "SKIP":
            # Show summary
            summary = (
                f"Summary:\n"
                f"Category: {data['primary_category']}\n"
                f"Location: {data['location']}\n"
                f"Description: {data['description']}\n\n"
                "Reply YES to submit or NO to cancel."
            )
            twiml.message(summary)
            update_session(sender_phone, step="CONFIRMING")
        elif num_media > 0:
            # Process single MMS photo
            media_url = form_data.get("MediaUrl0")
            content_type = form_data.get("MediaContentType0", "")
            
            if "image" in content_type:
                file_bytes = download_twilio_media(media_url)
                if file_bytes:
                    ext = content_type.split('/')[-1] if '/' in content_type else "jpg"
                    filename = f"sms_{sender_phone.replace('+','')}.{ext}"
                    upload_result = upload_telegram_media_to_cloudinary(file_bytes, filename, "image")
                    
                    if upload_result:
                        data["media_attachments"].append({
                            "url": upload_result["url"],
                            "public_id": upload_result["public_id"],
                            "type": "image",
                            "format": ext,
                            "name": "Photo 1"
                        })
            
            # After upload, show summary
            summary = (
                f"Summary:\n"
                f"Category: {data['primary_category']}\n"
                f"Location: {data['location']}\n"
                f"Description: {data['description']}\n"
                f"Photo: Attached\n\n"
                "Reply YES to submit or NO to cancel."
            )
            twiml.message(summary)
            update_session(sender_phone, step="CONFIRMING", data_update={"media_attachments": data["media_attachments"]})
        else:
            twiml.message("Please send a photo or reply SKIP to finish.")

    elif step == "CONFIRMING":
        if incoming_msg.upper() == "YES":
            report_payload = ReportCreate(
                citizen_name="SMS User",
                phone=sender_phone,
                primary_category=data["primary_category"],
                description=data["description"],
                location=data["location"],
                gps_coordinates=data.get("gps_coordinates"),
                media_attachments=data["media_attachments"],
                report_source="sms_bot"
            )
            
            try:
                result = await submit_bot_report(report_payload)
                if result["success"]:
                    twiml.message(
                        f"Report Submitted! ID: {result['report_id']}\n"
                        f"Assigned to: {result['assigned_ngo']}\n"
                        "Thank you for help!"
                    )
                else:
                    twiml.message("Submission failed. Please try again later.")
            except Exception as e:
                twiml.message(f"Error submitting report: {str(e)}")
            
            clear_session(sender_phone)
        elif incoming_msg.upper() == "NO":
            twiml.message("Report cancelled. Send anything to start over.")
            clear_session(sender_phone)
        else:
            twiml.message("Please reply with YES to submit or NO to cancel.")

    return Response(content=str(twiml), media_type="application/xml")

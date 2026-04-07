import os
from fastapi import APIRouter, Request, Response
from twilio.twiml.messaging_response import MessagingResponse
from app.services.whatsapp_session import get_session, update_session, clear_session
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

@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """
    Main webhook for Twilio WhatsApp incoming messages.
    Handles the conversational state machine for citizen reporting.
    """
    form_data = await request.form()
    incoming_msg = form_data.get("Body", "").strip()
    sender_phone = form_data.get("From", "") # format: 'whatsapp:+91XXXXXXXXXX'
    num_media = int(form_data.get("NumMedia", "0"))
    
    session = get_session(sender_phone)
    step = session["step"]
    data = session["data"]
    
    twiml = MessagingResponse()

    if step == "START":
        welcome_text = (
            "Hi! 👋 Welcome to *SevaSetu Reporting Bot* on WhatsApp.\n"
            "I'm here to help you report community issues.\n\n"
            "What type of issue would you like to report?\n"
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
                twiml.message(f"Got it. You're reporting a *{category}* issue.\n\nPlease provide a brief description of the problem.")
            else:
                twiml.message("Invalid choice. Please reply with a number from 1 to 6.")
        except ValueError:
            twiml.message("Please send only the number corresponding to your choice.")

    elif step == "DESCRIBING_ISSUE":
        update_session(sender_phone, step="GETTING_LOCATION", data_update={"description": incoming_msg})
        twiml.message("📍 Now, please share the location of this issue.\n\nYou can send a *Location Pin* using WhatsApp attachment or type the approximate address.")

    elif step == "GETTING_LOCATION":
        lat = form_data.get("Latitude")
        lon = form_data.get("Longitude")
        
        if lat and lon:
            update_session(sender_phone, step="UPLOADING_MEDIA", data_update={
                "gps_coordinates": f"{lat},{lon}",
                "location": f"GPS: {lat}, {lon}"
            })
        else:
            # Try to geocode the text address
            geo_result = geocode_address(incoming_msg)
            if geo_result:
                update_session(sender_phone, step="UPLOADING_MEDIA", data_update={
                    "gps_coordinates": f"{geo_result['lat']},{geo_result['lon']}",
                    "location": geo_result["display_name"]
                })
            else:
                update_session(sender_phone, step="UPLOADING_MEDIA", data_update={"location": incoming_msg})
        
        twiml.message(
            "📎 Please send any photos, videos, or documents (optional).\n\n"
            "You can send them one by one. When finished, reply *DONE*.\n"
            "If you don't have any files, just reply *SKIP*."
        )

    elif step == "UPLOADING_MEDIA":
        if incoming_msg.upper() in ["DONE", "SKIP"]:
            # Move to confirmation
            media_count = len(data.get("media_attachments", []))
            summary = (
                f"📝 *Report Summary*\n\n"
                f"*Category:* {data['primary_category']}\n"
                f"*Location:* {data['location']}\n"
                f"*Description:* {data['description']}\n"
                f"*Attachments:* {media_count} file(s)\n\n"
                "Shall I submit this report? Reply *YES* or *NO*."
            )
            twiml.message(summary)
            update_session(sender_phone, step="CONFIRMING")
        elif num_media > 0:
            # Process multiple media in one message if present
            for i in range(num_media):
                media_url = form_data.get(f"MediaUrl{i}")
                content_type = form_data.get(f"MediaContentType{i}", "")
                
                # Normalize media types for Cloudinary
                resource_type = "auto"
                if "image" in content_type: resource_type = "image"
                elif "video" in content_type: resource_type = "video"
                elif "audio" in content_type: resource_type = "video"
                
                # Download using Twilio service
                file_bytes = download_twilio_media(media_url)
                if file_bytes:
                    ext = content_type.split('/')[-1] if '/' in content_type else "file"
                    filename = f"wa_{sender_phone}_{i}.{ext}"
                    upload_result = upload_telegram_media_to_cloudinary(file_bytes, filename, resource_type)
                    
                    if upload_result:
                        # Generate a friendly display name based on content type
                        friendly_name = "Attachment"
                        if "image" in content_type: friendly_name = f"Photo {len(data['media_attachments']) + 1}"
                        elif "video" in content_type: friendly_name = f"Video {len(data['media_attachments']) + 1}"
                        elif "audio" in content_type: friendly_name = f"Voice Note {len(data['media_attachments']) + 1}"
                        elif "pdf" in content_type: friendly_name = f"Document {len(data['media_attachments']) + 1}"

                        data["media_attachments"].append({
                            "url": upload_result["url"],
                            "public_id": upload_result["public_id"],
                            "type": upload_result["resource_type"],
                            "format": ext,
                            "name": friendly_name
                        })
            
            update_session(sender_phone, data_update={"media_attachments": data["media_attachments"]})
            twiml.message(f"✅ Received {num_media} attachment(s). Send more or reply *DONE*.")
        else:
            twiml.message("Please send a file or reply *DONE* to finish.")

    elif step == "CONFIRMING":
        if incoming_msg.upper() == "YES":
            # Call the unified bot report submission logic
            report_payload = ReportCreate(
                citizen_name=f"WhatsApp User", # Could be extended to get sender name
                phone=sender_phone,
                primary_category=data["primary_category"],
                description=data["description"],
                location=data["location"],
                gps_coordinates=data.get("gps_coordinates"),
                media_attachments=data["media_attachments"],
                report_source="whatsapp_bot"
            )
            
            # Reuse the bot_routes submission logic
            try:
                result = await submit_bot_report(report_payload)
                if result["success"]:
                    twiml.message(
                        f"✅ *Report Submitted Successfully!*\n\n"
                        f"Report ID: `{result['report_id']}`\n"
                        f"Assigned to: *{result['assigned_ngo']}*\n\n"
                        "Thank you for helping the community! ❤️"
                    )
                else:
                    twiml.message("❌ Submission failed. Please try again later.")
            except Exception as e:
                twiml.message(f"❌ Error submitting report: {str(e)}")
            
            clear_session(sender_phone)
        elif incoming_msg.upper() == "NO":
            twiml.message("Report cancelled. Type *Hi* to start over.")
            clear_session(sender_phone)
        else:
            twiml.message("Please reply with *YES* to submit or *NO* to cancel.")

    return Response(content=str(twiml), media_type="application/xml")

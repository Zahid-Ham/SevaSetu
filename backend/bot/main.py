import os
import sys
import logging
import json
from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ConversationHandler,
    ContextTypes,
)
from dotenv import load_dotenv

# Setup dynamic path to make sure 'bot' and 'services' are findable
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.append(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import bot services
from bot.services.geo_service import geocode_address
from bot.services.media_service import upload_telegram_media_to_cloudinary
from bot.services.report_service import submit_bot_report_to_api

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Conversation states
CHOOSING_CATEGORY, DESCRIBING_ISSUE, GETTING_LOCATION, UPLOADING_MEDIA, CONFIRMING = range(5)

CATEGORIES = [
    ["Homeless Person Help"],
    ["Garbage & Sanitation"],
    ["Infrastructure Repair"],
    ["Electricity & Water"],
    ["Medical Emergency"],
    ["Other Issues"]
]

category_markup = ReplyKeyboardMarkup(CATEGORIES, one_time_keyboard=True)
done_markup = ReplyKeyboardMarkup([["Done ✅"]], one_time_keyboard=True)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Starts the conversation and asks for the issue category."""
    context.user_data["media_attachments"] = []
    await update.message.reply_text(
        "Hi! 👋 Welcome to SevaSetu Reporting Bot. \n"
        "I'm here to help you report issues in your community.\n\n"
        "What type of issue would you like to report?",
        reply_markup=category_markup,
    )
    return CHOOSING_CATEGORY

async def category_choice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Stores the category and asks for a description."""
    category = update.message.text
    context.user_data["primary_category"] = category
    
    await update.message.reply_text(
        f"Got it. You're reporting a '{category}' issue.\n"
        "Please provide a brief description of the problem.",
        reply_markup=ReplyKeyboardRemove(),
    )
    return DESCRIBING_ISSUE

async def issue_description(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Stores the description and asks for location."""
    description = update.message.text
    context.user_data["description"] = description
    
    await update.message.reply_text(
        "📍 Now, please share the location of this issue.\n"
        "You can send your current location (click the 📎 icon -> Location) or type the address."
    )
    return GETTING_LOCATION

async def get_location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Stores the location (GPS or text) and asks for media."""
    if update.message.location:
        lat = update.message.location.latitude
        lon = update.message.location.longitude
        context.user_data["gps_coordinates"] = f"{lat},{lon}"
        context.user_data["location"] = f"GPS: {lat}, {lon}"
    else:
        address = update.message.text
        context.user_data["location"] = address
        geo_result = geocode_address(address)
        if geo_result:
            context.user_data["gps_coordinates"] = f"{geo_result['lat']},{geo_result['lon']}"
            context.user_data["location"] = geo_result["display_name"]
            await update.message.reply_text(f"Understood: {geo_result['display_name']}")
    
    await update.message.reply_text(
        "📎 Please send any photos, videos, voice notes, or documents related to the issue.\n"
        "You can send multiple files one by one. When finished, press 'Done ✅'.\n"
        "Or type /skip if you don't have any files.",
        reply_markup=done_markup
    )
    return UPLOADING_MEDIA

async def handle_media_upload(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Generic handler for multiple media types."""
    message = update.message
    display_name = "Attachment"
    if message.photo:
        file_id = message.photo[-1].file_id
        resource_type = "image"
        file_ext = "jpg"
        display_name = f"Photo {len(context.user_data['media_attachments']) + 1}"
    elif message.video:
        file_id = message.video.file_id
        resource_type = "video"
        file_ext = "mp4"
        display_name = message.video.file_name or f"Video {len(context.user_data['media_attachments']) + 1}"
    elif message.voice:
        file_id = message.voice.file_id
        resource_type = "video" # Cloudinary treats audio as video resource type
        file_ext = "ogg"
        display_name = f"Voice Note {len(context.user_data['media_attachments']) + 1}"
    elif message.audio:
        file_id = message.audio.file_id
        resource_type = "video"
        file_ext = "mp3"
        display_name = message.audio.file_name or f"Audio {len(context.user_data['media_attachments']) + 1}"
    elif message.document:
        file_id = message.document.file_id
        resource_type = "auto"
        file_ext = message.document.file_name.split('.')[-1] if '.' in message.document.file_name else "doc"
        display_name = message.document.file_name or "Document"

    if not file_id:
        await update.message.reply_text("Invalid file type. Please send a photo, video, audio, or document.")
        return UPLOADING_MEDIA

    status_msg = await update.message.reply_text("⏳ Processing attachment...")
    
    try:
        new_file = await context.bot.get_file(file_id)
        file_bytes = await new_file.download_as_bytearray()
        
        filename = f"tg_{update.effective_user.id}_{file_id[:10]}.{file_ext}"
        result = upload_telegram_media_to_cloudinary(bytes(file_bytes), filename, resource_type)
        
        if result:
            attachment = {
                "url": result["url"],
                "public_id": result["public_id"],
                "type": result["resource_type"],
                "format": file_ext,
                "name": display_name
            }
            context.user_data["media_attachments"].append(attachment)
            
            await status_msg.edit_text(
                f"✅ Attached: {display_name}\n"
                f"Count: {len(context.user_data['media_attachments'])}\n"
                "You can send more or press 'Done ✅'."
            )
        else:
            await status_msg.edit_text("❌ Upload failed. Please try again.")
    except Exception as e:
        logger.error(f"Media handler error: {e}")
        await status_msg.edit_text("❌ An error occurred during upload.")

    return UPLOADING_MEDIA

async def finalize_report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Summary and final confirmation."""
    user_data = context.user_data
    media_count = len(user_data['media_attachments'])
    
    summary = (
        f"📝 **Report Summary**\n\n"
        f"Category: {user_data['primary_category']}\n"
        f"Location: {user_data['location']}\n"
        f"Description: {user_data['description']}\n"
        f"Attachments: {media_count} file(s)\n\n"
        "Shall I submit this report?"
    )
    
    reply_keyboard = [["Yes, Submit"], ["No, Cancel"]]
    await update.message.reply_text(
        summary,
        reply_markup=ReplyKeyboardMarkup(reply_keyboard, one_time_keyboard=True),
        parse_mode="Markdown"
    )
    return CONFIRMING

async def confirm_submission(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Submits the report via the API."""
    choice = update.message.text
    if choice == "Yes, Submit":
        await update.message.reply_text("🚀 Submitting report to SevaSetu...", reply_markup=ReplyKeyboardRemove())
        
        user_data = context.user_data
        
        # Extract main photo for compatibility with older fields if needed
        main_photo = next((m["url"] for m in user_data["media_attachments"] if m["type"] == "image"), None)
        main_photo_id = next((m["public_id"] for m in user_data["media_attachments"] if m["type"] == "image"), None)
        
        # Prepare payload
        payload = {
            "citizen_name": update.effective_user.full_name,
            "phone": f"tg:{update.effective_user.username or update.effective_user.id}",
            "primary_category": user_data["primary_category"],
            "description": user_data["description"],
            "location": user_data["location"],
            "gps_coordinates": user_data.get("gps_coordinates"),
            "media_attachments": user_data["media_attachments"],
            "photo_url": main_photo, # Keep for backward compatibility
            "photo_public_id": main_photo_id,
            "report_source": "telegram_bot",
            "urgency_level": "Moderate",
            "status": "Open"
        }
        
        result = submit_bot_report_to_api(payload)
        
        if result.get("success"):
            report_id = result.get("report_id", "#N/A")
            assigned_ngo = result.get("assigned_ngo", "a nearby NGO")
            await update.message.reply_text(
                f"✅ **Report Submitted Successfully!**\n\n"
                f"Report ID: `{report_id}`\n"
                f"Assigned to: **{assigned_ngo}**\n\n"
                "The NGO supervisor has been notified. Thank you for your contribution!",
                parse_mode="Markdown"
            )
        else:
            await update.message.reply_text(
                f"❌ Submission failed: {result.get('detail', 'Unknown error')}"
            )
    else:
        await update.message.reply_text("Report cancelled. You can start again with /start")
        
    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancels the conversation."""
    await update.message.reply_text("Process cancelled.", reply_markup=ReplyKeyboardRemove())
    return ConversationHandler.END

def main() -> None:
    """Run the bot."""
    if not TOKEN:
        print("Error: TELEGRAM_BOT_TOKEN not found in .env")
        return

    application = Application.builder().token(TOKEN).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            CHOOSING_CATEGORY: [MessageHandler(filters.TEXT & ~filters.COMMAND, category_choice)],
            DESCRIBING_ISSUE: [MessageHandler(filters.TEXT & ~filters.COMMAND, issue_description)],
            GETTING_LOCATION: [
                MessageHandler(filters.LOCATION, get_location),
                MessageHandler(filters.TEXT & ~filters.COMMAND, get_location)
            ],
            UPLOADING_MEDIA: [
                MessageHandler(filters.PHOTO | filters.VIDEO | filters.VOICE | filters.AUDIO | filters.Document.ALL, handle_media_upload),
                MessageHandler(filters.Regex("^Done ✅$"), finalize_report),
                CommandHandler("skip", finalize_report),
            ],
            CONFIRMING: [MessageHandler(filters.TEXT & ~filters.COMMAND, confirm_submission)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    application.add_handler(conv_handler)
    print("SevaSetu Bot is running... Press Ctrl+C to stop.")
    application.run_polling()

if __name__ == "__main__":
    main()

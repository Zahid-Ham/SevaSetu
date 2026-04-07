import os
import sys
import logging
import json

# Setup dynamic path to make sure 'bot' and 'services' are findable
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.append(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

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

# Absolute imports for better reliability
from bot.services.geo_service import geocode_address
from bot.services.media_service import upload_telegram_photo_to_cloudinary
from bot.services.report_service import submit_bot_report_to_api

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Conversation states
CHOOSING_CATEGORY, DESCRIBING_ISSUE, GETTING_LOCATION, UPLOADING_PHOTO, CONFIRMING = range(5)

CATEGORIES = [
    ["Homeless Person Help"],
    ["Garbage & Sanitation"],
    ["Infrastructure Repair"],
    ["Electricity & Water"],
    ["Medical Emergency"],
    ["Other Issues"]
]

category_markup = ReplyKeyboardMarkup(CATEGORIES, one_time_keyboard=True)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Starts the conversation and asks for the issue category."""
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
    """Stores the location (GPS or text) and asks for a photo."""
    if update.message.location:
        lat = update.message.location.latitude
        lon = update.message.location.longitude
        context.user_data["gps_coordinates"] = f"{lat},{lon}"
        context.user_data["location"] = f"GPS: {lat}, {lon}"
    else:
        address = update.message.text
        context.user_data["location"] = address
        # Try to geocode it
        geo_result = geocode_address(address)
        if geo_result:
            context.user_data["gps_coordinates"] = f"{geo_result['lat']},{geo_result['lon']}"
            context.user_data["location"] = geo_result["display_name"]
            await update.message.reply_text(f"Understood: {geo_result['display_name']}")
    
    await update.message.reply_text(
        "📷 Please send a photo or video of the issue (optional).\n"
        "This helps the NGO understand the severity. Type /skip if you don't have one."
    )
    return UPLOADING_PHOTO

async def upload_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Downloads the photo from Telegram and uploads to Cloudinary."""
    await update.message.reply_text("Processing your photo... Please wait.")
    
    photo_file = await update.message.photo[-1].get_file()
    photo_bytes = await photo_file.download_as_bytearray()
    
    # Upload to Cloudinary
    filename = f"tg_report_{update.effective_user.id}_{photo_file.file_id}.jpg"
    result = upload_telegram_photo_to_cloudinary(bytes(photo_bytes), filename)
    
    if result:
        context.user_data["photo_url"] = result["url"]
        context.user_data["photo_public_id"] = result["public_id"]
    
    return await finalize_report(update, context)

async def skip_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Skips photo and moves to final confirmation."""
    return await finalize_report(update, context)

async def finalize_report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Summary and final confirmation."""
    user_data = context.user_data
    summary = (
        f"📝 **Report Summary**\n\n"
        f"Category: {user_data['primary_category']}\n"
        f"Location: {user_data['location']}\n"
        f"Description: {user_data['description']}\n"
        f"Media: {'Attached' if 'photo_url' in user_data else 'None'}\n\n"
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
        
        # Prepare payload
        payload = {
            "citizen_name": update.effective_user.full_name,
            "phone": f"tg:{update.effective_user.username or update.effective_user.id}",
            "primary_category": context.user_data["primary_category"],
            "description": context.user_data["description"],
            "location": context.user_data["location"],
            "gps_coordinates": context.user_data.get("gps_coordinates"),
            "photo_url": context.user_data.get("photo_url"),
            "photo_public_id": context.user_data.get("photo_public_id"),
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
                f"❌ Something went wrong while submitting the report.\n"
                f"Error: {result.get('detail', 'Unknown error')}\n\n"
                "Please try again later using /start"
            )
    else:
        await update.message.reply_text(
            "Report cancelled. You can start again with /start",
            reply_markup=ReplyKeyboardRemove()
        )
        
    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancels the conversation."""
    await update.message.reply_text(
        "Report process cancelled. Hopefully next time!", reply_markup=ReplyKeyboardRemove()
    )
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
            UPLOADING_PHOTO: [
                MessageHandler(filters.PHOTO, upload_photo),
                CommandHandler("skip", skip_photo),
            ],
            CONFIRMING: [MessageHandler(filters.TEXT & ~filters.COMMAND, confirm_submission)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    application.add_handler(conv_handler)

    print("SevaSetu Bot is running... Press Ctrl+C to stop.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()

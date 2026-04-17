# backend/app/api/routes/ivr_routes.py
from fastapi import APIRouter, Request, Response
from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant
import os
import requests
from requests.auth import HTTPBasicAuth
import time
from fastapi.templating import Jinja2Templates
from app.services.ivr_session import get_ivr_session, update_ivr_session, clear_ivr_session
from app.services.whisper_service import transcribe_audio
from app.api.routes.bot_routes import submit_bot_report
from app.models.report_model import ReportCreate
import logging

# Set up dedicated IVR logging
logging.basicConfig(filename='voice_debug.log', level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ivr")

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

# --- Page Route ---
@router.get("/voice-demo")
async def voice_demo_page(request: Request):
    return templates.TemplateResponse("voice_demo.html", {"request": request})

# --- Config & Prompts ---
VOICE = "Polly.Aditi"  # Best Indian accent (Female)

PROMPTS = {
    "WELCOME": {
        "en": "Welcome to Seva Setu. For English, press 1. Hindi ke liye, do dabaaye.",
        "hi": "Seva Setu mein aapka swagat hai. Hindi ke liye, do dabaaye. For English, press 1."
    },
    "ASK_NAME": {
        "en": "Please state your full name after the beep.",
        "hi": "Beep ke baad kripya apna poora naam batayein."
    },
    "CONFIRM_NAME": {
        "en": "I heard your name is {}. Press 1 to confirm, or 2 to tell me again.",
        "hi": "Maine suna aapka naam {} hai. Confirm karne ke liye 1 dabaaye, ya vapas batane ke liye do."
    },
    "ASK_CATEGORY": {
        "en": "What is the issue category? Press 1 for Infrastructure, 2 for Sanitation, 3 for Water, 4 for Electricity, 5 for Medical, or 6 for Other.",
        "hi": "Samsya ki category kya hai? Infrastructure ke liye 1, safai ke liye 2, pani ke liye 3, bijli ke liye 4, medical ke liye 5, ya anya ke liye 6 dabaaye."
    },
    "CONFIRM_CATEGORY": {
        "en": "You selected {}. Press 1 to confirm, or 2 to change.",
        "hi": "Aapne {} chuna hai. Sahi hai toh 1 dabaaye, badalne ke liye do."
    },
    "ASK_LOCATION": {
        "en": "Please state the location of the issue after the beep.",
        "hi": "Beep ke baad kripys samsya ki jagah batayein."
    },
    "CONFIRM_LOCATION": {
        "en": "I heard the location is {}. Press 1 to confirm, or 2 to tell me again.",
        "hi": "Maine suna jagah {} hai. Sahi hai toh 1 dabaaye, ya vapas batayein ke liye do."
    },
    "ASK_DESCRIPTION": {
        "en": "Finally, please describe the issue in detail after the beep.",
        "hi": "Anth mein, kripya samsya ka poora vivaran batayein."
    },
    "CONFIRM_DESCRIPTION": {
        "en": "I heard: {}. Press 1 to submit your report, or 2 to record it again.",
        "hi": "Maine suna: {}. Report jama karne ke liye 1 dabaaye, ya vapas record karne ke liye do."
    },
    "SUCCESS": {
        "en": "Success! Your report has been submitted. Your report ID is {}. Thank you.",
        "hi": "Safaltaa! Aapki report jama ho gayi hai. Aapka report ID {} hai. Dhanyavaad."
    },
    "WAIT_AI": {
        "en": "Please wait while I process that...",
        "hi": "Kripya intezaar karein, main ise process kar rahi hoon..."
    }
}

CATEGORIES = {
    "1": "Infrastructure",
    "2": "Sanitation",
    "3": "Water Supply",
    "4": "Electricity",
    "5": "Medical Emergency",
    "6": "Other Issues"
}

def get_text(key, lang, *args):
    text = PROMPTS.get(key, {}).get(lang, "")
    if args:
        return text.format(*args)
    return text

def twiml_response(response: VoiceResponse):
    return Response(content=response.to_xml(), media_type="text/xml")

# --- Core Routes ---

@router.get("/voice/token")
def get_voice_token():
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    api_key = os.getenv("TWILIO_API_KEY")
    api_secret = os.getenv("TWILIO_API_SECRET")
    twiml_app_sid = os.getenv("TWILIO_TWIML_APP_SID")

    if not all([account_sid, api_key, api_secret, twiml_app_sid]):
        return {"error": "Twilio credits missing in .env"}

    try:
        current_time = int(time.time())
        token = AccessToken(account_sid, api_key, api_secret, identity="citizen_reporter", ttl=3600)
        token.nbf = current_time - 300 
        
        voice_grant = VoiceGrant(outgoing_application_sid=twiml_app_sid, incoming_allow=True)
        token.add_grant(voice_grant)
        
        return {"token": token.to_jwt()}
    except Exception as e:
        return {"error": str(e)}

@router.api_route("/voice/start", methods=["GET", "POST"])
async def voice_start():
    try:
        logger.info("[IVR] 📞 START - Call Connected")
        response = VoiceResponse()
        gather = Gather(num_digits=1, action="/voice/lang")
        gather.say(PROMPTS["WELCOME"]["en"], voice="alice") 
        response.append(gather)
        response.say("Goodbye.")
        return twiml_response(response)
    except Exception as e:
        logger.error(f"[IVR] ERROR START: {str(e)}", exc_info=True)
        return Response(content=f"<Response><Say>Error. {str(e)}</Say></Response>", media_type="text/xml")

@router.post("/voice/lang")
async def voice_lang(request: Request):
    try:
        form = await request.form()
        choice = form.get("Digits")
        call_sid = form.get("CallSid")
        logger.info(f"[IVR] 🌐 LANG - Choice: {choice}, SID: {call_sid}")
        
        lang = "hi" if choice == "2" else "en"
        tag = "hi-IN" if lang == "hi" else "en-IN"
        
        update_ivr_session(call_sid, {"language": lang, "step": "ASK_NAME"})
        
        response = VoiceResponse()
        response.say(get_text("ASK_NAME", lang), voice=VOICE, language=tag)
        response.record(action="/voice/process_name", max_length=15, play_beep=True, finish_on_key="1234567890*#")
        return twiml_response(response)
    except Exception as e:
        logger.error(f"[IVR] ERROR LANG: {str(e)}", exc_info=True)
        return twiml_response(VoiceResponse().say("Language error."))

@router.post("/voice/process_name")
async def voice_process_name(request: Request):
    try:
        form = await request.form()
        rec_url = form.get("RecordingUrl")
        call_sid = form.get("CallSid")
        logger.info(f"[IVR] 👤 PROC_NAME - Downloading...")
        
        session = get_ivr_session(call_sid)
        lang, tag = session["language"], ("hi-IN" if session["language"]=="hi" else "en-IN")

        response = VoiceResponse()
        response.say(get_text("WAIT_AI", lang), voice=VOICE, language=tag)
        
        auth = HTTPBasicAuth(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        local_path = f"uploads/name_{call_sid}.mp3"
        with open(local_path, "wb") as f:
            f.write(requests.get(rec_url, auth=auth).content)
        
        logger.info(f"[IVR] 🎤 Transcribing in {lang}...")
        name = transcribe_audio(local_path, language=lang)
        update_ivr_session(call_sid, {"name": name})
        os.remove(local_path)

        gather = Gather(num_digits=1, action="/voice/confirm_name")
        gather.say(get_text("CONFIRM_NAME", lang, name), voice=VOICE, language=tag)
        response.append(gather)
        return twiml_response(response)
    except Exception as e:
        logger.error(f"[IVR] ERROR PROC_NAME: {str(e)}", exc_info=True)
        return twiml_response(VoiceResponse().say("Name error."))

@router.post("/voice/confirm_name")
async def voice_confirm_name(request: Request):
    try:
        form = await request.form()
        choice, call_sid = form.get("Digits"), form.get("CallSid")
        session = get_ivr_session(call_sid)
        lang, tag = session["language"], ("hi-IN" if session["language"]=="hi" else "en-IN")
        logger.info(f"[IVR] 👤 CONFIRM_NAME - Choice: {choice}")

        response = VoiceResponse()
        if choice == "1":
            update_ivr_session(call_sid, {"step": "ASK_CATEGORY"})
            gather = Gather(num_digits=1, action="/voice/process_category")
            gather.say(get_text("ASK_CATEGORY", lang), voice=VOICE, language=tag)
            response.append(gather)
        else:
            response.say(get_text("ASK_NAME", lang), voice=VOICE, language=tag)
            response.record(action="/voice/process_name", max_length=15, play_beep=True, finish_on_key="#")
        return twiml_response(response)
    except Exception as e:
        logger.error(f"[IVR] ERROR CONF_NAME: {str(e)}", exc_info=True)
        return twiml_response(VoiceResponse().say("Confirm error."))

@router.post("/voice/process_category")
async def voice_process_category(request: Request):
    try:
        form = await request.form()
        choice, call_sid = form.get("Digits"), form.get("CallSid")
        session = get_ivr_session(call_sid)
        lang, tag = session["language"], ("hi-IN" if session["language"]=="hi" else "en-IN")
        
        cat_name = CATEGORIES.get(choice, "Other Issues")
        update_ivr_session(call_sid, {"category": cat_name})
        logger.info(f"[IVR] 📁 PROC_CAT - Selected: {cat_name}")

        response = VoiceResponse()
        gather = Gather(num_digits=1, action="/voice/confirm_category")
        gather.say(get_text("CONFIRM_CATEGORY", lang, cat_name), voice=VOICE, language=tag)
        response.append(gather)
        return twiml_response(response)
    except Exception as e:
        logger.error(f"[IVR] ERROR PROC_CAT: {str(e)}")
        return twiml_response(VoiceResponse().say("Category processing error."))

@router.post("/voice/confirm_category")
async def voice_confirm_category(request: Request):
    try:
        form = await request.form()
        choice, call_sid = form.get("Digits"), form.get("CallSid")
        session = get_ivr_session(call_sid)
        lang, tag = session["language"], ("hi-IN" if session["language"]=="hi" else "en-IN")

        response = VoiceResponse()
        if choice == "1":
            update_ivr_session(call_sid, {"step": "ASK_LOCATION"})
            response.say(get_text("ASK_LOCATION", lang), voice=VOICE, language=tag)
            response.record(action="/voice/process_location", max_length=20, play_beep=True, finish_on_key="#")
        else:
            gather = Gather(num_digits=1, action="/voice/process_category")
            gather.say(get_text("ASK_CATEGORY", lang), voice=VOICE, language=tag)
            response.append(gather)
        return twiml_response(response)
    except Exception as e:
        return twiml_response(VoiceResponse().say("Category confirm error."))

@router.post("/voice/process_location")
async def voice_process_location(request: Request):
    try:
        form = await request.form()
        rec_url, call_sid = form.get("RecordingUrl"), form.get("CallSid")
        session = get_ivr_session(call_sid)
        lang, tag = session["language"], ("hi-IN" if session["language"]=="hi" else "en-IN")

        response = VoiceResponse()
        response.say(get_text("WAIT_AI", lang), voice=VOICE, language=tag)
        
        auth = HTTPBasicAuth(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        local_path = f"uploads/loc_{call_sid}.mp3"
        r = requests.get(rec_url, auth=auth)
        with open(local_path, "wb") as f:
            f.write(r.content)
        
        logger.info(f"[IVR] 🎤 Transcribing in {lang}...")
        location = transcribe_audio(local_path, language=lang)
        update_ivr_session(call_sid, {"location": location})
        os.remove(local_path)

        gather = Gather(num_digits=1, action="/voice/confirm_location")
        gather.say(get_text("CONFIRM_LOCATION", lang, location), voice=VOICE, language=tag)
        response.append(gather)
        return twiml_response(response)
    except Exception as e:
        return twiml_response(VoiceResponse().say("Location processing error."))

@router.post("/voice/confirm_location")
async def voice_confirm_location(request: Request):
    try:
        form = await request.form()
        choice, call_sid = form.get("Digits"), form.get("CallSid")
        session = get_ivr_session(call_sid)
        lang, tag = session["language"], ("hi-IN" if session["language"]=="hi" else "en-IN")

        response = VoiceResponse()
        if choice == "1":
            update_ivr_session(call_sid, {"step": "ASK_DESCRIPTION"})
            response.say(get_text("ASK_DESCRIPTION", lang), voice=VOICE, language=tag)
            response.record(action="/voice/process_description", max_length=45, play_beep=True, finish_on_key="#")
        else:
            response.say(get_text("ASK_LOCATION", lang), voice=VOICE, language=tag)
            response.record(action="/voice/process_location", max_length=20, play_beep=True, finish_on_key="#")
        return twiml_response(response)
    except Exception as e:
        return twiml_response(VoiceResponse().say("Location confirm error."))

@router.post("/voice/process_description")
async def voice_process_description(request: Request):
    try:
        form = await request.form()
        rec_url, call_sid = form.get("RecordingUrl"), form.get("CallSid")
        session = get_ivr_session(call_sid)
        lang, tag = session["language"], ("hi-IN" if session["language"]=="hi" else "en-IN")

        response = VoiceResponse()
        response.say(get_text("WAIT_AI", lang), voice=VOICE, language=tag)
        
        auth = HTTPBasicAuth(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        local_path = f"uploads/desc_{call_sid}.mp3"
        r = requests.get(rec_url, auth=auth)
        with open(local_path, "wb") as f:
            f.write(r.content)
        
        logger.info(f"[IVR] 🎤 Transcribing in {lang}...")
        description = transcribe_audio(local_path, language=lang)
        update_ivr_session(call_sid, {"description": description})
        os.remove(local_path)

        gather = Gather(num_digits=1, action="/voice/confirm_description")
        gather.say(get_text("CONFIRM_DESCRIPTION", lang, description), voice=VOICE, language=tag)
        response.append(gather)
        return twiml_response(response)
    except Exception as e:
        return twiml_response(VoiceResponse().say("Description processing error."))

@router.post("/voice/confirm_description")
async def voice_confirm_description(request: Request):
    try:
        form = await request.form()
        choice, call_sid = form.get("Digits"), form.get("CallSid")
        session = get_ivr_session(call_sid)
        lang, tag = session["language"], ("hi-IN" if session["language"]=="hi" else "en-IN")

        response = VoiceResponse()
        if choice == "1":
            report_payload = ReportCreate(
                citizen_name=session.get("name", "Voice Reporter"),
                phone=form.get("From", "Browser Call"),
                primary_category=session.get("category", "Other Issues"),
                description=session.get("description", ""),
                location=session.get("location", "Unknown"),
                gps_coordinates=None,
                media_attachments=[],
                report_source="ivr_bot"
            )
            submit_result = await submit_bot_report(report_payload)
            if submit_result["success"]:
                report_id = submit_result['report_id']
                update_ivr_session(call_sid, {"step": "COMPLETED", "report_id": report_id})
                response.say(get_text("SUCCESS", lang, report_id), voice=VOICE, language=tag)
            else:
                response.say("Submission failed.", voice=VOICE, language=tag)
            response.hangup()
        else:
            response.say(get_text("ASK_DESCRIPTION", lang), voice=VOICE, language=tag)
            response.record(action="/voice/process_description", max_length=45, play_beep=True, finish_on_key="1234567890*#")
        return twiml_response(response)
    except Exception as e:
        return twiml_response(VoiceResponse().say("Final confirm error."))

@router.get("/voice/status/{call_sid}")
async def get_voice_status(call_sid: str):
    session = get_ivr_session(call_sid)
    sum_text = f"Name: {session.get('name')}\nCategory: {session.get('category')}\nLocation: {session.get('location')}\nDesc: {session.get('description')}"
    return {
        "status": session.get("step"),
        "transcription": sum_text.strip(),
        "report_id": session.get("report_id")
    }

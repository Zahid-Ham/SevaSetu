import os
import requests
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")

def download_twilio_media(media_url: str) -> bytes:
    """
    Downloads media from Twilio's URL using authentication.
    """
    try:
        # Twilio documentation: To download media, use requests with Basic Auth
        response = requests.get(media_url, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN))
        if response.status_code == 200:
            return response.content
        else:
            print(f"Twilio media download failed: Status {response.status_code}")
            return None
    except Exception as e:
        print(f"Twilio media download error: {e}")
        return None

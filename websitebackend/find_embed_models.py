import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

print("--- EMBED-CAPABLE MODELS ---")
for model in client.models.list():
    if "embed" in model.name or "embedContent" in model.supported_actions:
        print(f"Name: {model.name}, Actions: {model.supported_actions}")

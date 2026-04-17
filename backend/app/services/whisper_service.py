# backend/app/services/whisper_service.py
import os
from groq import Groq  # type: ignore

def transcribe_audio(audio_path: str, language: str = None) -> str:
    """
    Uses Groq's Whisper API to quickly transcribe audio files with Indian context.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Warning: GROQ_API_KEY not found in .env, skipping transcription.")
        return "Audio transcription unavailable (missing API key)."

    # Contextual prompt to help Whisper with Indian names and community issues
    indian_context_prompt = (
        "This is an Indian citizen reporting a community issue for SevaSetu. "
        "Expect Indian names like Zahid, Rahul, Priya, and cities like Mumbai, Delhi. "
        "Keywords: garbage, waste, electricity, water leakage, potholes, street lights, emergency."
    )

    try:
        client = Groq(api_key=api_key)
        with open(audio_path, "rb") as file:
            # Prepare transcription arguments
            kwargs = {
                "file": (audio_path, file.read()),
                "model": "whisper-large-v3-turbo",
                "prompt": indian_context_prompt,
                "response_format": "text"
            }
            
            # If language is provided (e.g., 'hi' or 'en'), force it
            if language:
                kwargs["language"] = language

            transcription = client.audio.transcriptions.create(**kwargs)
            
        # If response_format="text", transcription is the string itself
        return str(transcription).strip() if transcription else "Audio transcription empty."
    except Exception as e:
        print(f"Error transcribing audio with Groq: {e}")
        return "Audio transcription failed."

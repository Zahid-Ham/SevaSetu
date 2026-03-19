import os
from groq import Groq  # type: ignore

def transcribe_audio(audio_path: str) -> str:
    """
    Uses Groq's Whisper API to quickly transcribe audio files.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Warning: GROQ_API_KEY not found in .env, skipping transcription.")
        return "Audio transcription unavailable (missing API key)."

    try:
        client = Groq(api_key=api_key)
        with open(audio_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(audio_path, file.read()),
                model="whisper-large-v3-turbo",
            )
        return transcription.text
    except Exception as e:
        print(f"Error transcribing audio with Groq: {e}")
        return "Audio transcription failed."

import os
import io
import base64
import tempfile
from dotenv import load_dotenv

load_dotenv()

def transcribe_audio_google(audio_bytes: bytes, hint_format: str = "mp3") -> str:
    """
    Uses Gemini Files API for robust audio transcription.
    Handles any format: mp3, m4a, amr, webm, aac, wav.
    Falls back to inline base64 if file upload fails.
    """
    import google.generativeai as genai  # type: ignore

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        return "Transcription error: GEMINI_API_KEY not set"
    
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash')

    prompt = """Transcribe the following audio recording accurately.
Return ONLY the transcribed text, nothing else. No labels, no formatting.
If the audio contains Hindi, Urdu, or Hinglish, transcribe it accurately using Roman script.
If no clear speech is detected, return: No speech detected."""

    # Primary: Gemini Files API (handles any audio format robustly)
    try:
        temp_suffix = f".{hint_format}" if hint_format else ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=temp_suffix) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        print(f"[Gemini STT] Uploading audio via Files API ({len(audio_bytes)} bytes)...")
        audio_file = genai.upload_file(path=tmp_path)
        
        import time
        while audio_file.state.name == "PROCESSING":
            time.sleep(1)
            audio_file = genai.get_file(audio_file.name)

        if audio_file.state.name == "ACTIVE":
            response = model.generate_content([prompt, audio_file])
            genai.delete_file(audio_file.name)
            try: os.unlink(tmp_path)
            except: pass
            transcript = response.text.strip()
            print(f"[Gemini STT] ✅ Transcribed: {transcript[:100]}")
            return transcript if transcript else "No speech detected."
        else:
            print(f"[Gemini STT] File state: {audio_file.state.name}")
            try: os.unlink(tmp_path)
            except: pass
    except Exception as e:
        print(f"[Gemini STT Files API] Error: {e}")

    # Fallback: Inline base64
    try:
        print("[Gemini STT Fallback] Trying inline base64...")
        audio_part = {
            "mime_type": "audio/mpeg",
            "data": base64.b64encode(audio_bytes).decode("utf-8")
        }
        response = model.generate_content([prompt, audio_part])
        transcript = response.text.strip()
        print(f"[Gemini STT Fallback] ✅ Transcribed: {transcript[:100]}")
        return transcript if transcript else "No speech detected."
    except Exception as e:
        print(f"[Gemini STT Fallback] Error: {e}")
        return f"Transcription failed: {str(e)}"

def transcribe_audio_file_google(file_path: str) -> str:
    """
    Transcribes a local audio file using Gemini Files API.
    """
    try:
        ext = file_path.split(".")[-1] if "." in file_path else "mp3"
        with io.open(file_path, "rb") as f:
            content = f.read()
        return transcribe_audio_google(content, hint_format=ext)
    except Exception as e:
        print(f"[STT File] Error reading {file_path}: {e}")
        return f"File read error: {str(e)}"

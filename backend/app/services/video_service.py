import os
import tempfile
from moviepy import VideoFileClip  # Updated for MoviePy 2.x

def extract_audio_from_video(video_path: str) -> str:
    """
    Extracts the audio track from a video file and saves it as a temporary MP3.
    Returns the path to the extracted audio file.
    """
    try:
        if not os.path.exists(video_path):
             raise FileNotFoundError(f"Video file not found: {video_path}")
             
        video = VideoFileClip(video_path)
        
        # Create temporary audio path
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_audio:
            temp_audio_path = temp_audio.name
            
        print(f"[VideoService] Extracting audio to: {temp_audio_path}")
        video.audio.write_audiofile(temp_audio_path, logger=None)
        
        # Close clip to release file
        video.close()
        
        return temp_audio_path
    except Exception as e:
        print(f"[VideoService] Error: {e}")
        return ""

def cleanup_file(file_path: str):
    """
    Utility to safely delete a file if it exists.
    """
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Error cleaning up file {file_path}: {e}")

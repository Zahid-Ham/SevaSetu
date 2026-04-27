import os
import json
import logging
import google.generativeai as genai
from groq import Groq

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STATE_FILE = "translation_state.json"

class TranslationManager:
    def __init__(self):
        # Load keys from environment
        gemini_keys_raw = os.getenv("GEMINI_API_KEY", "")
        groq_keys_raw = os.getenv("GROQ_API_KEY", "")
        
        self.gemini_keys = [k.strip() for k in gemini_keys_raw.split(",") if k.strip()]
        self.groq_keys = [k.strip() for k in groq_keys_raw.split(",") if k.strip()]
        
        # Initial state
        self.current_provider = "gemini" # Default
        self.gemini_index = 0
        self.groq_index = 0
        
        self._load_state()

    def _load_state(self):
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, 'r') as f:
                    state = json.load(f)
                    self.current_provider = state.get("current_provider", "gemini")
                    self.gemini_index = state.get("gemini_index", 0)
                    self.groq_index = state.get("groq_index", 0)
                    logger.info(f"[TranslationManager] Loaded state: {self.current_provider} (Gemini:{self.gemini_index}, Groq:{self.groq_index})")
            except Exception as e:
                logger.error(f"[TranslationManager] Failed to load state: {e}")

    def _save_state(self):
        try:
            state = {
                "current_provider": self.current_provider,
                "gemini_index": self.gemini_index,
                "groq_index": self.groq_index
            }
            with open(STATE_FILE, 'w') as f:
                json.dump(state, f)
        except Exception as e:
            logger.error(f"[TranslationManager] Failed to save state: {e}")

    def _get_active_key(self):
        if self.current_provider == "gemini":
            if not self.gemini_keys:
                return None
            return self.gemini_keys[self.gemini_index % len(self.gemini_keys)]
        else:
            if not self.groq_keys:
                return None
            return self.groq_keys[self.groq_index % len(self.groq_keys)]

    async def translate(self, text: str):
        if not text:
            return ""

        prompt = f"""
Translate the following text into accurate, natural Hindi. 
Rules:
1. Provide ONLY the Hindi translation.
2. NO conversational filler, NO quotes, NO markdown blocks.
3. Keep it brief.

Text to translate:
{text}
"""
        from app.services.ai_service import ai_manager
        translated = await ai_manager.generate_text(prompt)

        if translated:
            # Clean up markdown if any
            if translated.startswith("```"):
                parts = translated.split("```")
                if len(parts) > 1:
                    translated = parts[1]
                    if translated.startswith("hindi\n") or translated.startswith("Hindi\n"):
                        translated = translated[6:].strip()
            
            return translated

        logger.error("[TranslationManager] All providers failed. Returning original text.")
        return text

    # Helper methods kept for backward compatibility if needed by other components
    def _rotate_key(self):
        from app.services.ai_service import ai_manager
        ai_manager._rotate_key()

    def _switch_provider(self):
        from app.services.ai_service import ai_manager
        ai_manager._switch_provider()

# Singleton instance
translator = TranslationManager()

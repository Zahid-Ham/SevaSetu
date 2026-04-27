import os
import json
import logging
import google.generativeai as genai
from groq import Groq
from typing import List, Optional, Union, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STATE_FILE = "ai_state.json"

class AIManager:
    def __init__(self):
        # Load keys from environment
        # Supports comma-separated keys for rotation
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
                    logger.info(f"[AIManager] Loaded state: {self.current_provider} (Gemini:{self.gemini_index}, Groq:{self.groq_index})")
            except Exception as e:
                logger.error(f"[AIManager] Failed to load state: {e}")

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
            logger.error(f"[AIManager] Failed to save state: {e}")

    def _get_active_key(self):
        if self.current_provider == "gemini":
            if not self.gemini_keys:
                return None
            return self.gemini_keys[self.gemini_index % len(self.gemini_keys)]
        else:
            if not self.groq_keys:
                return None
            return self.groq_keys[self.groq_index % len(self.groq_keys)]

    def _rotate_key(self):
        if self.current_provider == "gemini":
            self.gemini_index += 1
            if self.gemini_index >= len(self.gemini_keys):
                logger.info("[AIManager] All Gemini keys exhausted. Switching to Groq.")
                self.current_provider = "groq"
        else:
            self.groq_index += 1
            if self.groq_index >= len(self.groq_keys):
                logger.info("[AIManager] All Groq keys exhausted. Retrying Gemini from start.")
                self.current_provider = "gemini"
                self.gemini_index = 0
        self._save_state()

    def _switch_provider(self):
        if self.current_provider == "gemini":
            self.current_provider = "groq"
        else:
            self.current_provider = "gemini"
        self._save_state()

    async def generate_text(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """
        Generates text using the active provider with automatic fallback.
        """
        total_attempts = len(self.gemini_keys) + len(self.groq_keys)
        if total_attempts == 0:
            logger.error("[AIManager] No API keys configured for Gemini or Groq.")
            return ""

        for attempt in range(total_attempts):
            api_key = self._get_active_key()
            if not api_key:
                self._switch_provider()
                continue

            try:
                if self.current_provider == "gemini":
                    logger.info(f"[AIManager] Attempting Gemini (Key Index: {self.gemini_index % len(self.gemini_keys)})")
                    genai.configure(api_key=api_key)
                    # Using the user's preferred model
                    model_name = 'gemini-2.5-flash'
                    model = genai.GenerativeModel(model_name)
                    
                    full_prompt = prompt
                    if system_instruction:
                        full_prompt = f"{system_instruction}\n\n{prompt}"
                    
                    response = model.generate_content(full_prompt)
                    result = response.text.strip()
                    if result:
                        self._save_state()
                        return result

                else:
                    logger.info(f"[AIManager] Attempting Groq (Key Index: {self.groq_index % len(self.groq_keys)})")
                    client = Groq(api_key=api_key)
                    
                    messages = []
                    if system_instruction:
                        messages.append({"role": "system", "content": system_instruction})
                    messages.append({"role": "user", "content": prompt})
                    
                    completion = client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=messages
                    )
                    result = completion.choices[0].message.content.strip()
                    if result:
                        self._save_state()
                        return result

            except Exception as e:
                err_str = str(e).lower()
                logger.warning(f"[AIManager] Error using {self.current_provider}: {e}")
                
                # Check for rate limits or quota issues
                if "429" in err_str or "quota" in err_str or "rate limit" in err_str or "exhausted" in err_str:
                    logger.info(f"[AIManager] Quota hit for {self.current_provider}. Rotating...")
                    self._rotate_key()
                else:
                    # Other errors also trigger rotation to be safe
                    self._rotate_key()

        logger.error("[AIManager] All attempts failed.")
        return ""

# Singleton instance
ai_manager = AIManager()

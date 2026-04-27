import os
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.translation_service import translator

router = APIRouter()

class TranslationRequest(BaseModel):
    text: str

class TranslationResponse(BaseModel):
    translated_text: str

class TranslationPersistRequest(BaseModel):
    text: str
    collection: Optional[str] = None
    doc_id: Optional[str] = None
    field: Optional[str] = None

@router.post("/translate", response_model=TranslationResponse)
async def translate_text(req: TranslationRequest):
    """
    Dynamically translates English text to Hindi for UI fallback mapping.
    Uses multi-key rotation (Gemini & Groq) with persistent caching.
    """
    if not req.text or not req.text.strip():
        return TranslationResponse(translated_text="")

    try:
        hindi_text = await translator.translate(req.text)
        return TranslationResponse(translated_text=hindi_text)
    except Exception as e:
        print(f"[Translation Route] Unexpected error: {e}")
        # Final fallback: return original text
        return TranslationResponse(translated_text=req.text)

@router.post("/translate-and-persist", response_model=TranslationResponse)
async def translate_and_persist(req: TranslationPersistRequest):
    """
    Translates text AND updates the database if collection/doc_id/field are provided.
    This enables 'on-the-fly' caching of translations for legacy data.
    """
    if not req.text or not req.text.strip():
        return TranslationResponse(translated_text="")

    try:
        # 1. Translate
        hindi_text = await translator.translate(req.text)
        
        # 2. Persist to DB if requested
        if req.collection and req.doc_id and req.field:
            from app.services.firestore_service import update_document, db
            
            # Check if it's already a bilingual object or needs to be converted
            doc_ref = db.collection(req.collection).document(req.doc_id)
            doc = doc_ref.get()
            
            if doc.exists:
                # We update the field to be a bilingual object
                # even if it was a plain string before.
                update_document(req.collection, req.doc_id, {
                    req.field: {
                        "en": req.text,
                        "hi": hindi_text
                    }
                })
                print(f"[Translate & Persist] Updated {req.collection}/{req.doc_id}.{req.field}")

        return TranslationResponse(translated_text=hindi_text)
    except Exception as e:
        print(f"[Translate & Persist] Error: {e}")
        return TranslationResponse(translated_text=req.text)

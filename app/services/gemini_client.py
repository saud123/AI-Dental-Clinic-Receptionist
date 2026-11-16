import json
from typing import Literal

import google.generativeai as genai

from app.core.config import settings

# Configure once at import time
genai.configure(api_key=settings.GEMINI_API_KEY)


_chat_model = genai.GenerativeModel(settings.GEMINI_CHAT_MODEL)
_classifier_model = genai.GenerativeModel(settings.GEMINI_CLASSIFIER_MODEL)


def generate_reply(
    system_instruction: str,
    history: list[dict],
    user_message: str,
    *,
    temperature: float = 0.4,
    max_output_tokens: int = 400,
) -> str:
    """Generate a chat reply using Gemini.

    history = [{"role": "user"|"model", "parts": ["..."]}, ...]
    """
    # Gemini chat session: pass history + new message
    model = genai.GenerativeModel(
        settings.GEMINI_CHAT_MODEL,
        system_instruction=system_instruction,
    )
    chat = model.start_chat(history=history)
    response = chat.send_message(
        user_message,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        },
    )
    return (response.text or "").strip()


def classify_clinic_related(message: str) -> bool:
    """Fast YES/NO check: is this message about the dental clinic?

    Used as the first guardrail layer.
    Falls back to True (allow) if the model fails, so a bad classifier
    never blocks a real patient.
    """
    prompt = (
        "You are a binary classifier for a DENTAL CLINIC assistant.\n"
        "Answer ONLY with the word YES or NO.\n\n"
        "A message is CLINIC-RELATED (YES) if it asks about:\n"
        "- Booking, cancelling, rescheduling appointments\n"
        "- Clinic hours, location, contact info\n"
        "- Doctors, specialties, services offered\n"
        "- Dental symptoms (for triage, not diagnosis)\n"
        "- Fees, prices, insurance (clinic-level)\n"
        "- Anything else about THIS dental clinic\n\n"
        "A message is UNRELATED (NO) if it asks about:\n"
        "- Homework, coding, general knowledge, politics, jokes\n"
        "- Other clinics or unrelated businesses\n"
        "- Anything not about this clinic or dental care\n\n"
        f'Message: "{message}"\n\n'
        "Answer:"
    )
    try:
        response = _classifier_model.generate_content(
            prompt,
            generation_config={"temperature": 0.0, "max_output_tokens": 5},
        )
        answer = (response.text or "").strip().upper()
        return answer.startswith("YES")
    except Exception:
        # Fail open — if the classifier errors, allow the message
        return True


def embed_text(text: str) -> list[float]:
    """Return a 768-dim embedding for the given text."""
    model_name = settings.GEMINI_EMBEDDING_MODEL
    if not model_name.startswith("models/") and not model_name.startswith("tunedModels/"):
        model_name = f"models/{model_name}"
    result = genai.embed_content(
        model=model_name,
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]

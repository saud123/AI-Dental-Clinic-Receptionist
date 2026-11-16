"""Two-layer guardrail: intent classifier + refusal template."""
from app.services.gemini_client import classify_clinic_related
REFUSAL_TEMPLATE = (
    "I understand — but I'm the clinic's receptionist, so I can only help with "
    "appointments, clinic information, and dental questions. "
    "Would you like me to book you a slot or connect you to a doctor?"
)
def check_message(message: str) -> tuple[bool, str | None]:
    if not message or not message.strip():
        return False, "Could you tell me a bit more about what you need?"
    if not classify_clinic_related(message):
        return False, REFUSAL_TEMPLATE
    return True, None

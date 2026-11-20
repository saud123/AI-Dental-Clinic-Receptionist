"""GeminiClient — text generation, classification, embeddings, tool-calling."""

from typing import Callable

import google.generativeai as genai
from google.generativeai import protos

from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

_chat_model = genai.GenerativeModel(settings.GEMINI_CHAT_MODEL)
_classifier_model = genai.GenerativeModel(settings.GEMINI_CLASSIFIER_MODEL)


# ==================== TOOL DEFINITIONS ====================
# IMPORTANT: Using genai.protos.Tool (not raw dict). The SDK only reliably
# parses tools when given proper protobuf objects — dict format gets silently
# dropped in some SDK versions, causing Gemini to never call any tool.

CLINIC_TOOLS = [
    protos.Tool(
        function_declarations=[
            # ---------- list_doctors ----------
            protos.FunctionDeclaration(
                name="list_doctors",
                description=(
                    "List all dentists available at this clinic with their specialty. "
                    "Call this when the patient asks which doctors are available, or "
                    "before booking an appointment if you don't know which doctor they want."
                ),
                parameters=protos.Schema(
                    type=protos.Type.OBJECT,
                    properties={},
                ),
            ),

            # ---------- book_appointment ----------
            protos.FunctionDeclaration(
                name="book_appointment",
                description=(
                    "Book a NEW dental appointment for the CURRENT patient. "
                    "Only call this AFTER you have confirmed the doctor, date, and time "
                    "with the patient in the conversation. The scheduled_at must be an "
                    "ISO 8601 string like 2026-11-20T15:00:00. If the patient gives a "
                    "relative time (e.g. 'tomorrow at 3pm'), convert it to an ISO date first."
                    "DO check if there is a appointment conflict before booking. If there is a conflict, ask the patient to choose a different time or provide suggestion."
                ),
                parameters=protos.Schema(
                    type=protos.Type.OBJECT,
                    properties={
                        "doctor_id": protos.Schema(
                            type=protos.Type.INTEGER,
                            description="The doctor's user ID from list_doctors.",
                        ),
                        "scheduled_at": protos.Schema(
                            type=protos.Type.STRING,
                            description="ISO 8601 datetime, e.g. 2026-11-20T15:00:00",
                        ),
                        "duration_minutes": protos.Schema(
                            type=protos.Type.INTEGER,
                            description="Duration in minutes. Default 30.",
                        ),
                        "notes": protos.Schema(
                            type=protos.Type.STRING,
                            description="Reason for the visit or any notes.",
                        ),
                    },
                    required=["doctor_id", "scheduled_at"],
                ),
            ),

            # ---------- list_my_appointments ----------
            protos.FunctionDeclaration(
                name="list_my_appointments",
                description=(
                    "List the CURRENT patient's existing appointments with their IDs, "
                    "doctor, date/time, and status. You MUST call this FIRST when the "
                    "patient asks to cancel or reschedule — you need the appointment_id. "
                    "Never guess or invent an appointment ID."
                ),
                parameters=protos.Schema(
                    type=protos.Type.OBJECT,
                    properties={},
                ),
            ),

            # ---------- cancel_appointment ----------
            protos.FunctionDeclaration(
                name="cancel_appointment",
                description=(
                    "Cancel ONE of the patient's existing appointments. "
                    "You MUST call list_my_appointments first to get the appointment_id, "
                    "and CONFIRM with the patient which appointment to cancel before "
                    "calling this. Never cancel without explicit patient confirmation."
                ),
                parameters=protos.Schema(
                    type=protos.Type.OBJECT,
                    properties={
                        "appointment_id": protos.Schema(
                            type=protos.Type.INTEGER,
                            description="The appointment ID from list_my_appointments.",
                        ),
                        "reason": protos.Schema(
                            type=protos.Type.STRING,
                            description="Optional reason for cancellation.",
                        ),
                    },
                    required=["appointment_id"],
                ),
            ),

            # ---------- reschedule_appointment ----------
            protos.FunctionDeclaration(
                name="reschedule_appointment",
                description=(
                    "Reschedule an existing appointment to a new date/time. "
                    "You MUST call list_my_appointments first to get the appointment_id, "
                    "and CONFIRM the new date/time with the patient before calling this. "
                    "new_scheduled_at must be ISO 8601 like 2026-12-15T15:00:00."
                ),
                parameters=protos.Schema(
                    type=protos.Type.OBJECT,
                    properties={
                        "appointment_id": protos.Schema(
                            type=protos.Type.INTEGER,
                            description="The appointment ID from list_my_appointments.",
                        ),
                        "new_scheduled_at": protos.Schema(
                            type=protos.Type.STRING,
                            description="New ISO 8601 datetime, e.g. 2026-12-20T15:00:00",
                        ),
                    },
                    required=["appointment_id", "new_scheduled_at"],
                ),
            ),
        ]
    )
]


# ==================== SIMPLE TEXT GENERATION ====================

def generate_reply(
    system_instruction: str,
    history: list[dict],
    user_message: str,
    *,
    temperature: float = 0.3,
    max_output_tokens: int = 400,
) -> str:
    """Plain text reply (kept for backwards compatibility)."""
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


# ==================== TOOL-AWARE GENERATION ====================

def generate_reply_with_tools(
    system_instruction: str,
    history: list[dict],
    user_message: str,
    tool_executor: Callable[[str, dict], dict],
    *,
    temperature: float = 0.4,
    max_output_tokens: int = 600,
    max_tool_rounds: int = 5,
) -> str:
    """
    Generate a reply with tool-calling loop.

    tool_executor(name, args) -> dict  (result of executing the tool)
    """
    model = genai.GenerativeModel(
        settings.GEMINI_CHAT_MODEL,
        system_instruction=system_instruction,
        tools=CLINIC_TOOLS,
    )
    chat = model.start_chat(history=history)
    response = chat.send_message(
        user_message,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        },
    )

    for round_idx in range(max_tool_rounds):
        candidate = response.candidates[0]
        parts = (
            candidate.content.parts
            if candidate.content and candidate.content.parts
            else []
        )

        # 🔍 DEBUG — tells us if Gemini recognized the tools
        print(
            f"[GEMINI DEBUG] round={round_idx} "
            f"num_parts={len(parts)} "
            f"part_types={[type(p).__name__ for p in parts]}"
        )

        # Collect any function calls Gemini wants to make
        function_calls = [
            part.function_call
            for part in parts
            if getattr(part, "function_call", None)
        ]
        print(
            f"[GEMINI DEBUG] function_calls_detected="
            f"{[fc.name for fc in function_calls]}"
        )

        if not function_calls:
            break

        # Execute each tool call and build the function-response payload
        response_parts = []
        for fc in function_calls:
            try:
                args = dict(fc.args) if fc.args else {}
            except Exception:
                args = {}

            try:
                result = tool_executor(fc.name, args)
            except Exception as e:
                result = {"error": f"{type(e).__name__}: {e}"}

            # Gemini requires JSON-serializable dict response
            if not isinstance(result, dict):
                result = {"value": str(result)}

            print(f"[GEMINI DEBUG] tool={fc.name} args={args} result={result}")

            response_parts.append(
                protos.Part(
                    function_response=protos.FunctionResponse(
                        name=fc.name,
                        response=result,
                    )
                )
            )

        response = chat.send_message(
            response_parts,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
            },
        )

    # response.text raises if last message was a function_call with no text
    try:
        return (response.text or "").strip()
    except Exception:
        return ""


# ==================== CLASSIFIER ====================

def classify_clinic_related(message: str) -> bool:
    prompt = (
        "You are a binary classifier for a DENTAL CLINIC assistant.\n"
        "Answer ONLY with the word YES or NO.\n\n"
        "CLINIC-RELATED (YES): booking, cancellations, rescheduling, clinic hours, "
        "doctors, symptoms, prices, anything about this dental clinic.\n"
        "UNRELATED (NO): homework, coding, general knowledge, politics, jokes, "
        "other clinics.\n\n"
        f'Message: "{message}"\n\nAnswer:'
    )
    try:
        response = _classifier_model.generate_content(
            prompt,
            generation_config={"temperature": 0.0, "max_output_tokens": 5},
        )
        return (response.text or "").strip().upper().startswith("YES")
    except Exception:
        return True  # fail-open


# ==================== EMBEDDINGS ====================

def embed_text(text: str) -> list[float]:
    model_name = settings.GEMINI_EMBEDDING_MODEL
    if not model_name.startswith("models/") and not model_name.startswith(
        "tunedModels/"
    ):
        model_name = f"models/{model_name}"
    result = genai.embed_content(
        model=model_name,
        content=text,
        task_type="retrieval_document",
        output_dimensionality=768,
    )
    return result["embedding"]
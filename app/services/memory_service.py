"""Memory service for long-term patient recall."""
import logging
from sqlalchemy.orm import Session

from app.models.chat import ChatMessage, ChatSession, SessionMemory
from app.services import gemini_client

logger = logging.getLogger(__name__)


def summarize_and_save(db: Session, session_id: int) -> SessionMemory | None:
    """Summarize a closed chat session and save its embedding into SessionMemory."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        return None

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id)
        .all()
    )

    if not messages:
        summary = "No conversation took place in this session."
    else:
        convo_lines = [f"{m.sender.value if hasattr(m.sender, 'value') else m.sender}: {m.content}" for m in messages]
        convo_text = "\n".join(convo_lines)
        prompt = (
            "Summarize this dental clinic chat session in 2-3 concise sentences. "
            "Highlight the patient's concerns, symptoms, appointments discussed, and key requests:\n\n"
            f"{convo_text}"
        )
        try:
            summary = gemini_client.generate_reply(
                system_instruction="You are an AI receptionist assistant creating concise clinical summaries of patient chat sessions.",
                history=[],
                user_message=prompt,
                temperature=0.2,
                max_output_tokens=250,
            )
            if not summary or not summary.strip():
                summary = convo_text[:300]
        except Exception as e:
            logger.warning(f"Failed to generate session summary with Gemini: {e}")
            summary = convo_text[:300]

    embedding = None
    try:
        embedding = gemini_client.embed_text(summary)
    except Exception as e:
        logger.warning(f"Failed to embed session summary: {e}")

    memory = SessionMemory(
        patient_id=session.patient_id,
        session_id=session.id,
        content=summary,
        embedding=embedding,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


def get_recent_memories(db: Session, patient_id: int, limit: int = 3) -> list[SessionMemory]:
    """Return the most recent SessionMemory rows for a patient."""
    return (
        db.query(SessionMemory)
        .filter(SessionMemory.patient_id == patient_id)
        .order_by(SessionMemory.created_at.desc(), SessionMemory.id.desc())
        .limit(limit)
        .all()
    )


def build_memory_context(memories: list[SessionMemory]) -> str:
    """Format recent memories into a prompt context string."""
    if not memories:
        return ""

    lines = [f"{idx + 1}. {m.content}" for idx, m in enumerate(reversed(memories))]
    return "Previous visits:\n" + "\n".join(lines)

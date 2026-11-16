"""Handoff service for patient <-> doctor threads."""
import logging
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.chat import ChatMessage, ChatSession, ChatSessionStatus
from app.models.thread import DoctorThread, DoctorThreadStatus, ThreadMessage, ThreadSender
from app.models.user import User, UserRole
from app.services import gemini_client

logger = logging.getLogger(__name__)


def request_handoff(
    db: Session,
    patient: User,
    doctor_id: int,
    session_id: int | None = None,
    appointment_id: int | None = None,
) -> DoctorThread:
    """Request a handoff from an active chat session to a doctor."""
    doctor = db.query(User).filter(User.id == doctor_id, User.role == UserRole.DOCTOR).first()
    if not doctor:
        doctor = db.query(User).filter(User.role == UserRole.DOCTOR).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    if session_id:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.patient_id == patient.id)
            .first()
        )
    else:
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.patient_id == patient.id,
                ChatSession.status.in_([ChatSessionStatus.ACTIVE, ChatSessionStatus.HANDED_OFF]),
            )
            .order_by(ChatSession.id.desc())
            .first()
        )

    if not session:
        raise HTTPException(status_code=404, detail="Active chat session not found for handoff")

    # Check if a thread already exists for this session
    existing_thread = db.query(DoctorThread).filter(DoctorThread.session_id == session.id).first()
    if existing_thread:
        return existing_thread

    # Summarize messages in session
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.id)
        .all()
    )

    if messages:
        convo_lines = [f"{m.sender.value if hasattr(m.sender, 'value') else m.sender}: {m.content}" for m in messages]
        prompt = (
            "Summarize the patient's concerns, symptoms, and reason for requesting a doctor in 2-3 concise sentences:\n\n"
            + "\n".join(convo_lines)
        )
        try:
            summary = gemini_client.generate_reply(
                system_instruction="You are a dental clinic receptionist preparing a concise doctor handoff summary.",
                history=[],
                user_message=prompt,
                temperature=0.2,
                max_output_tokens=250,
            )
            if not summary or not summary.strip():
                summary = "Patient requested doctor handoff."
        except Exception as e:
            logger.warning(f"Failed to generate handoff summary with Gemini: {e}")
            summary = "Patient requested doctor consultation regarding dental care."
    else:
        summary = "Patient requested doctor handoff."

    thread = DoctorThread(
        session_id=session.id,
        patient_id=patient.id,
        doctor_id=doctor.id,
        appointment_id=appointment_id,
        summary_text=summary,
        status=DoctorThreadStatus.WAITING_FOR_DOCTOR,
    )
    session.status = ChatSessionStatus.HANDED_OFF
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread


def list_doctor_threads(db: Session, doctor: User) -> list[DoctorThread]:
    """List threads assigned to a doctor (or all threads if assistant/admin)."""
    query = db.query(DoctorThread)
    if doctor.role == UserRole.DOCTOR:
        query = query.filter(DoctorThread.doctor_id == doctor.id)
    return query.order_by(DoctorThread.status, DoctorThread.created_at.desc()).all()


def list_patient_threads(db: Session, patient: User) -> list[DoctorThread]:
    """List threads created by a patient."""
    return (
        db.query(DoctorThread)
        .filter(DoctorThread.patient_id == patient.id)
        .order_by(DoctorThread.created_at.desc())
        .all()
    )


def get_thread(db: Session, thread_id: int, current_user: User) -> DoctorThread:
    """Get a thread ensuring the current user is authorized to view it."""
    thread = db.query(DoctorThread).filter(DoctorThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    if current_user.role == UserRole.PATIENT and thread.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.role == UserRole.DOCTOR and thread.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return thread


def doctor_reply(db: Session, thread_id: int, doctor: User, content: str) -> ThreadMessage:
    """Post a reply from a doctor to a thread."""
    thread = db.query(DoctorThread).filter(DoctorThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    if doctor.role != UserRole.ADMIN and thread.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Only assigned doctor can reply to this thread")

    msg = ThreadMessage(
        thread_id=thread.id,
        sender=ThreadSender.DOCTOR,
        content=content,
    )
    db.add(msg)
    thread.status = DoctorThreadStatus.WAITING_FOR_PATIENT

    session = db.query(ChatSession).filter(ChatSession.id == thread.session_id).first()
    if session:
        session.status = ChatSessionStatus.IN_DOCTOR_THREAD

    db.commit()
    db.refresh(msg)
    return msg


def patient_reply(db: Session, thread_id: int, patient: User, content: str) -> ThreadMessage:
    """Post a reply from a patient to a thread."""
    thread = db.query(DoctorThread).filter(DoctorThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    if thread.patient_id != patient.id:
        raise HTTPException(status_code=403, detail="Only the thread patient can reply")

    msg = ThreadMessage(
        thread_id=thread.id,
        sender=ThreadSender.PATIENT,
        content=content,
    )
    db.add(msg)
    thread.status = DoctorThreadStatus.WAITING_FOR_DOCTOR
    db.commit()
    db.refresh(msg)
    return msg

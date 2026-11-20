from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import require_role
from app.models.chat import ChatMessage, ChatSession, ChatSessionStatus
from app.models.user import User, UserRole
from app.models.notification import NotificationType
from app.models.thread import DoctorThread
from app.schemas.chat import (
    ChatMessageOut,
    ChatSessionDetail,
    ChatSessionOut,
    MessageCreate,
)
from app.services import chat_service, memory_service, review_service
from app.services.notification_service import create_notification

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=ChatSessionOut)
def create_or_resume_session(
    force_new: bool = Query(
        False, description="If true, close current active session and start a brand-new one."
    ),
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    return chat_service.get_or_create_active_session(
        db, current_user, force_new=force_new
    )


@router.get("/sessions/me", response_model=list[ChatSessionOut])
def my_sessions(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.patient_id == current_user.id)
        .order_by(ChatSession.id.desc())
        .all()
    )

    results = []
    for s in sessions:
        thread = (
            db.query(DoctorThread)
            .filter(DoctorThread.session_id == s.id)
            .first()
        )
        results.append({
            "id": s.id,
            "patient_id": s.patient_id,
            "doctor_id": s.doctor_id,
            "doctor_thread_id": thread.id if thread else None,
            "status": s.status,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        })
    return results


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
def get_session(
    session_id: int,
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.patient_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.id)
        .all()
    )

    thread = (
        db.query(DoctorThread)
        .filter(DoctorThread.session_id == session.id)
        .first()
    )
    thread_id = thread.id if thread else None

    # FIXED: attach doctor_thread_id to every message so ChatMessageOut
    # schema validation does not blow up with 500.
    messages_out = [
        {
            "id": m.id,
            "session_id": m.session_id,
            "sender": m.sender,
            "content": m.content,
            "is_voice": m.is_voice,
            "read_at": m.read_at,
            "created_at": m.created_at,
            "doctor_thread_id": thread_id,
        }
        for m in messages
    ]

    return {
        "id": session.id,
        "patient_id": session.patient_id,
        "doctor_id": session.doctor_id,
        "doctor_thread_id": thread_id,
        "status": session.status,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "messages": messages_out,
    }


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageOut)
def send_chat_message(
    session_id: int,
    payload: MessageCreate,
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    sent_msg = chat_service.send_message(
        db, current_user, session_id, payload.content, payload.is_voice
    )

    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session and session.doctor_id:
        thread = (
            db.query(DoctorThread)
            .filter(DoctorThread.session_id == session.id)
            .first()
        )
        link = f"/dashboard/threads/{thread.id}" if thread else f"/dashboard/threads/{session.id}"
        create_notification(
            db,
            session.doctor_id,
            NotificationType.NEW_MESSAGE,
            f"New message from {current_user.full_name}",
            f"Patient sent: {payload.content[:80]}...",
            link_url=link,
        )

    return sent_msg


@router.post("/sessions/{session_id}/close", response_model=ChatSessionOut)
def close_session(
    session_id: int,
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.patient_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = ChatSessionStatus.CLOSED
    session.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)

    try:
        memory_service.summarize_and_save(db, session.id)
    except Exception:
        pass

    try:
        review_service.create_review_request(db, current_user.id, session.id)
    except Exception:
        pass

    return session


@router.post("/sessions/{session_id}/escalate", response_model=ChatSessionOut)
def escalate_session(
    session_id: int,
    doctor_id: int = Body(..., embed=True),
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    """Close current AI session, create a new WAITING_FOR_DOCTOR session,
    and immediately create the DoctorThread so the notification link is valid."""
    current_session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.patient_id == current_user.id)
        .first()
    )
    if not current_session:
        raise HTTPException(status_code=404, detail="Session not found")

    current_session.status = ChatSessionStatus.CLOSED
    current_session.closed_at = datetime.now(timezone.utc)
    db.commit()

    new_session = ChatSession(
        patient_id=current_session.patient_id,
        doctor_id=doctor_id,
        status=ChatSessionStatus.WAITING_FOR_DOCTOR
        if hasattr(ChatSessionStatus, "WAITING_FOR_DOCTOR")
        else ChatSessionStatus.HANDED_OFF,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Create the DoctorThread immediately
    try:
        new_thread = DoctorThread(
            session_id=new_session.id,
            patient_id=new_session.patient_id,
            doctor_id=doctor_id,
        )
        db.add(new_thread)
        db.commit()
        db.refresh(new_thread)
        thread_id_for_link = new_thread.id
    except Exception:
        db.rollback()
        thread_id_for_link = new_session.id

    create_notification(
        db,
        doctor_id,
        NotificationType.DOCTOR_JOINED,
        f"New handoff from {current_user.full_name}",
        "A patient has requested to speak with you.",
        link_url=f"/dashboard/threads/{thread_id_for_link}",
    )

    return new_session
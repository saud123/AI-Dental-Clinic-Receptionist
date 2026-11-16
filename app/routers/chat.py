from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import require_role
from app.models.chat import ChatMessage, ChatSession, ChatSessionStatus
from app.models.user import User, UserRole
from app.schemas.chat import (
    ChatMessageOut,
    ChatSessionDetail,
    ChatSessionOut,
    MessageCreate,
)
from app.services import chat_service, memory_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=ChatSessionOut)
def create_or_resume_session(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    return chat_service.get_or_create_active_session(db, current_user)


@router.get("/sessions/me", response_model=list[ChatSessionOut])
def my_sessions(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    return (
        db.query(ChatSession)
        .filter(ChatSession.patient_id == current_user.id)
        .order_by(ChatSession.id.desc())
        .all()
    )


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

    return {
        "id": session.id,
        "patient_id": session.patient_id,
        "status": session.status,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "messages": messages,
    }


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageOut)
def send_chat_message(
    session_id: int,
    payload: MessageCreate,
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    return chat_service.send_message(
        db, current_user, session_id, payload.content, payload.is_voice
    )


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
        from app.services import review_service
        review_service.create_review_request(db, current_user.id, session.id)
    except Exception:
        pass

    return session

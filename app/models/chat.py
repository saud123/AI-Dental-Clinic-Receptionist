from datetime import datetime
from sqlalchemy import String, Text, DateTime, Boolean, ForeignKey, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
import enum

from app.db.session import Base


class ChatSessionStatus(str, enum.Enum):
    ACTIVE = "active"
    HANDED_OFF = "handed_off"
    IN_DOCTOR_THREAD = "in_doctor_thread"
    CLOSED = "closed"


class MessageSender(str, enum.Enum):
    PATIENT = "patient"
    BOT = "bot"
    DOCTOR = "doctor"
    SYSTEM = "system"


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    doctor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    status: Mapped[ChatSessionStatus] = mapped_column(
        SAEnum(ChatSessionStatus, name="chat_session_status"),
        default=ChatSessionStatus.ACTIVE,
        nullable=False,
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    messages = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sender: Mapped[MessageSender] = mapped_column(
        SAEnum(MessageSender, name="message_sender"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_voice: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session = relationship("ChatSession", back_populates="messages")


class SessionMemory(Base):
    """Long-term chatbot memory — one row per (patient, session) summary."""

    __tablename__ = "session_memories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # 768 dims = Gemini text-embedding-004 default size
    embedding: Mapped[list[float] | None] = mapped_column(Vector(768), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
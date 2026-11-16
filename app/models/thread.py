from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.db.session import Base


class DoctorThreadStatus(str, enum.Enum):
    OPEN = "open"
    WAITING_FOR_DOCTOR = "waiting_for_doctor"
    WAITING_FOR_PATIENT = "waiting_for_patient"
    CLOSED = "closed"


class ThreadSender(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"


class DoctorThread(Base):
    __tablename__ = "doctor_threads"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True
    )
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[DoctorThreadStatus] = mapped_column(
        SAEnum(DoctorThreadStatus, name="doctor_thread_status"),
        default=DoctorThreadStatus.WAITING_FOR_DOCTOR,
        nullable=False,
    )
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
        "ThreadMessage", back_populates="thread", cascade="all, delete-orphan"
    )


class ThreadMessage(Base):
    __tablename__ = "thread_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("doctor_threads.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sender: Mapped[ThreadSender] = mapped_column(
        SAEnum(ThreadSender, name="thread_sender"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    thread = relationship("DoctorThread", back_populates="messages")
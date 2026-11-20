import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Boolean, ForeignKey, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class NotificationType(str, enum.Enum):
    NEW_MESSAGE = "new_message"
    DOCTOR_JOINED = "doctor_joined"
    SESSION_CLOSED = "session_closed"
    AI_REPLY = "ai_reply"
    WAITING_FOR_DOCTOR = "waiting_for_doctor"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    type: Mapped[NotificationType] = mapped_column(
        SAEnum(NotificationType, name="notification_type"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    link_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", backref="notifications")
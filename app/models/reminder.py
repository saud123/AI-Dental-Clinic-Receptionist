from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.db.session import Base


class ReminderType(str, enum.Enum):
    APPOINTMENT_REMINDER_24H = "appointment_reminder_24h"
    APPOINTMENT_REMINDER_2H = "appointment_reminder_2h"
    RESCHEDULE_NOTICE = "reschedule_notice"
    REVIEW_REQUEST = "review_request"
    DOCTOR_DAILY_TODO = "doctor_daily_todo"


class ReminderStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    recipient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    type: Mapped[ReminderType] = mapped_column(
        SAEnum(ReminderType, name="reminder_type"), nullable=False
    )
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    scheduled_for: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[ReminderStatus] = mapped_column(
        SAEnum(ReminderStatus, name="reminder_status"),
        default=ReminderStatus.PENDING,
        nullable=False,
    )
    related_appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
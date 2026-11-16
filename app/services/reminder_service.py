from datetime import datetime, timezone
import logging
from sqlalchemy.orm import Session

from app.core import email
from app.models.appointment import Appointment
from app.models.reminder import Reminder, ReminderStatus, ReminderType
from app.models.user import User

logger = logging.getLogger(__name__)


def create_reminder(
    db: Session,
    recipient_id: int,
    type: ReminderType,
    subject: str,
    body: str,
    scheduled_for: datetime,
    appointment_id: int | None = None,
) -> Reminder:
    """Insert a new reminder row."""
    reminder = Reminder(
        recipient_id=recipient_id,
        type=type,
        subject=subject,
        body=body,
        scheduled_for=scheduled_for,
        related_appointment_id=appointment_id,
        status=ReminderStatus.PENDING,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def send_due_reminders(db: Session) -> int:
    """Send all pending reminders that are due."""
    now = datetime.now(timezone.utc)
    due_reminders = (
        db.query(Reminder)
        .filter(Reminder.scheduled_for <= now, Reminder.status == ReminderStatus.PENDING)
        .all()
    )
    sent_count = 0
    for r in due_reminders:
        user = db.query(User).filter(User.id == r.recipient_id).first()
        recipient_email = user.email if user else None
        if not recipient_email:
            r.status = ReminderStatus.FAILED
            continue
        success = email.send_email(to=recipient_email, subject=r.subject, body=r.body)
        if success:
            r.status = ReminderStatus.SENT
            r.sent_at = datetime.now(timezone.utc)
            sent_count += 1
        else:
            r.status = ReminderStatus.FAILED

    db.commit()
    return sent_count


def create_reschedule_reminders_for_block(
    db: Session,
    block,
    affected_appointment_ids: list[int],
) -> list[Reminder]:
    """Create reschedule notice reminders for affected appointments and send immediately."""
    now = datetime.now(timezone.utc)
    created = []
    for appt_id in affected_appointment_ids:
        appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
        if not appt:
            continue
        subject = "Appointment Reschedule Notice - AI Dental Clinic"
        body = (
            f"Dear Patient,\n\n"
            f"Your appointment scheduled for {appt.scheduled_at} needs to be rescheduled due to doctor unavailability "
            f"({block.reason or 'scheduling conflict'}).\n"
            f"Please log in or chat with our receptionist to choose a new time slot.\n\n"
            f"Best regards,\nAI Dental Clinic Team"
        )
        reminder = create_reminder(
            db=db,
            recipient_id=appt.patient_id,
            type=ReminderType.RESCHEDULE_NOTICE,
            subject=subject,
            body=body,
            scheduled_for=now,
            appointment_id=appt.id,
        )
        # Send immediately
        user = db.query(User).filter(User.id == appt.patient_id).first()
        if user and user.email:
            success = email.send_email(to=user.email, subject=subject, body=body)
            if success:
                reminder.status = ReminderStatus.SENT
                reminder.sent_at = datetime.now(timezone.utc)
                db.commit()
        created.append(reminder)
    return created

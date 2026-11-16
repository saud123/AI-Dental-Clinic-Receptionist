from datetime import datetime, timezone
import logging
from sqlalchemy.orm import Session

from app.core import email
from app.models.chat import ChatSession, ChatSessionStatus
from app.models.reminder import Reminder, ReminderStatus, ReminderType
from app.models.review import Review
from app.models.user import User

logger = logging.getLogger(__name__)


def create_review_request(db: Session, patient_id: int, session_id: int) -> Reminder | None:
    """Create a review request reminder and send an email to the patient."""
    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient or not patient.email:
        return None

    now = datetime.now(timezone.utc)
    subject = "How was your experience? - AI Dental Clinic"
    body = (
        f"Hi {patient.full_name},\n\n"
        f"Thank you for reaching out to AI Dental Clinic. We would love to hear your feedback!\n"
        f"Please take a moment to rate your recent session: did we solve your issue?\n\n"
        f"Best regards,\nAI Dental Clinic Team"
    )

    reminder = Reminder(
        recipient_id=patient_id,
        type=ReminderType.REVIEW_REQUEST,
        subject=subject,
        body=body,
        scheduled_for=now,
        status=ReminderStatus.PENDING,
    )
    db.add(reminder)

    if email.send_email(to=patient.email, subject=subject, body=body):
        reminder.status = ReminderStatus.SENT
        reminder.sent_at = now

    db.commit()
    db.refresh(reminder)
    return reminder


def submit_review(
    db: Session,
    patient: User,
    session_id: int | None,
    issue_solved: bool | None,
    rating: int | None,
    comment: str | None,
) -> Review:
    """Submit a review for a session or general experience."""
    review = Review(
        patient_id=patient.id,
        session_id=session_id,
        issue_solved=issue_solved,
        rating=rating,
        comment=comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def list_pending_reviews(db: Session, patient: User) -> list[ChatSession]:
    """Return closed sessions for the patient that do not have a review yet."""
    reviewed_session_ids = [
        r[0]
        for r in db.query(Review.session_id)
        .filter(Review.patient_id == patient.id, Review.session_id.isnot(None))
        .all()
    ]
    query = db.query(ChatSession).filter(
        ChatSession.patient_id == patient.id,
        ChatSession.status == ChatSessionStatus.CLOSED,
    )
    if reviewed_session_ids:
        query = query.filter(~ChatSession.id.in_(reviewed_session_ids))
    return query.order_by(ChatSession.id.desc()).limit(10).all()

from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import Base
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole


def create_notification(
    db: Session,
    user_id: int,
    notif_type: NotificationType,
    title: str,
    body: str,
    link_url: str | None = None,
) -> Notification:
    """Create a new notification for a user."""
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        body=body,
        link_url=link_url,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def get_unread_count(db: Session, user_id: int) -> int:
    """Get the count of unread notifications for a user."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .count()
    )


def mark_read(db: Session, notif_id: int) -> Notification | None:
    """Mark a single notification as read."""
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        return None
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


def mark_all_read(db: Session, user_id: int) -> int:
    """Mark all notifications as read for a user. Returns the count updated."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .update({"is_read": True})
    )
    db.commit()
    return count


def get_my_notifications(
    db: Session,
    user_id: int,
    limit: int = 20,
) -> list[Notification]:
    """Get the most recent notifications for a user."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
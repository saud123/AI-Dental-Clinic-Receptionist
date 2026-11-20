from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.notification import Notification, NotificationType
from app.schemas.notification import NotificationOut, UnreadCountOut, SuccessOut
from app.services.notification_service import (
    create_notification,
    get_unread_count,
    mark_read,
    mark_all_read,
    get_my_notifications,
)
from app.models.user import User


router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("/me", response_model=list[NotificationOut])
def get_my_notifications_endpoint(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the most recent notifications for the authenticated user."""
    return get_my_notifications(db, current_user.id, limit=limit)


@router.get("/me/unread-count", response_model=UnreadCountOut)
def get_unread_count_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the count of unread notifications for the authenticated user."""
    count = get_unread_count(db, current_user.id)
    return {"count": count}


@router.post("/{notif_id}/read", response_model=NotificationOut)
def mark_read_endpoint(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notif = mark_read(db, notif_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your notification")
    return notif


@router.post("/read-all", response_model=SuccessOut)
def mark_all_read_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for the authenticated user."""
    count = mark_all_read(db, current_user.id)
    return {"success": True, "marked_count": count}
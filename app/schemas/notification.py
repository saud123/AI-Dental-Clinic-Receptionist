import enum
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NotificationType(str, enum.Enum):
    NEW_MESSAGE = "new_message"
    DOCTOR_JOINED = "doctor_joined"
    SESSION_CLOSED = "session_closed"
    AI_REPLY = "ai_reply"
    WAITING_FOR_DOCTOR = "waiting_for_doctor"


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    type: NotificationType
    title: str
    body: str
    link_url: str | None
    is_read: bool
    created_at: datetime


class UnreadCountOut(BaseModel):
    count: int


class SuccessOut(BaseModel):
    success: bool = True
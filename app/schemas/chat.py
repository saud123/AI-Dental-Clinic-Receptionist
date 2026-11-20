from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

from app.models.chat import ChatSessionStatus, MessageSender


class ChatMessageOut(BaseModel):
    id: int
    session_id: int
    sender: MessageSender
    doctor_thread_id: int | None = None
    content: str
    is_voice: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ChatSessionOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int | None = None
    doctor_thread_id: int | None = None
    status: ChatSessionStatus
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ChatSessionDetail(ChatSessionOut):
    messages: list[ChatMessageOut] = []


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    is_voice: bool = False
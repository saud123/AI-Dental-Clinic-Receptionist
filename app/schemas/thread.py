from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

from app.models.thread import DoctorThreadStatus, ThreadSender


class ThreadMessageOut(BaseModel):
    id: int
    thread_id: int
    sender: ThreadSender
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ThreadMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class HandoffRequest(BaseModel):
    doctor_id: int
    session_id: int | None = None
    appointment_id: int | None = None


class DoctorThreadOut(BaseModel):
    id: int
    session_id: int
    appointment_id: int | None = None
    patient_id: int
    doctor_id: int
    summary_text: str | None = None
    status: DoctorThreadStatus
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DoctorThreadDetail(DoctorThreadOut):
    patient_name: str = ""
    doctor_name: str = ""
    messages: list[ThreadMessageOut] = []

from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

from app.models.appointment import AppointmentStatus


class AppointmentCreate(BaseModel):
    doctor_id: int
    scheduled_at: datetime
    duration_minutes: int = Field(default=30, ge=15, le=120)
    notes: str | None = None


class AppointmentReschedule(BaseModel):
    scheduled_at: datetime


class AppointmentOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    duration_minutes: int
    status: AppointmentStatus
    notes: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AvailabilityBlockCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    reason: str | None = None


class AvailabilityBlockOut(BaseModel):
    id: int
    doctor_id: int
    start_time: datetime
    end_time: datetime
    reason: str | None = None
    affected_appointment_ids: list[int] = []
    model_config = ConfigDict(from_attributes=True)
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class QrOut(BaseModel):
    token: str
    image: str
    message: str = "Scan this QR code at the clinic reception desk to check in."


class QrResolveIn(BaseModel):
    token: str


class QrResolved(BaseModel):
    patient_id: int
    full_name: str
    email: str
    phone: str | None = None
    next_appointment_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)

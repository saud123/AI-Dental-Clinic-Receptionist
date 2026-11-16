from datetime import datetime, date
from pydantic import BaseModel

from app.models.user import User


class PatientOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: str | None = None
    date_of_birth: date | None = None
    address: str | None = None
    is_active: bool
    created_at: datetime

    @classmethod
    def from_user(cls, user: User):
        p = user.patient_profile
        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone=p.phone if p else None,
            date_of_birth=p.date_of_birth if p else None,
            address=p.address if p else None,
            is_active=user.is_active,
            created_at=user.created_at,
        )


class PatientUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    address: str | None = None
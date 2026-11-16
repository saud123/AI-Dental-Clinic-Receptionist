from datetime import datetime
from pydantic import BaseModel

from app.models.user import User


class DoctorOut(BaseModel):
    id: int
    email: str
    full_name: str
    specialty: str | None = None
    bio: str | None = None
    working_hours: str | None = None
    is_available: bool = True
    created_at: datetime

    @classmethod
    def from_user(cls, user: User):
        d = user.doctor_profile
        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            specialty=d.specialty if d else None,
            bio=d.bio if d else None,
            working_hours=d.working_hours if d else None,
            is_available=d.is_available if d else True,
            created_at=user.created_at,
        )
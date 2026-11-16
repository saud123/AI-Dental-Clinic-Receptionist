from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.user import User, UserRole


def list_doctors(db: Session) -> list[User]:
    return (
        db.query(User)
        .options(joinedload(User.doctor_profile))
        .filter(User.role == UserRole.DOCTOR, User.is_active.is_(True))
        .order_by(User.id)
        .all()
    )


def get_doctor(db: Session, doctor_id: int) -> User:
    user = (
        db.query(User)
        .options(joinedload(User.doctor_profile))
        .filter(User.id == doctor_id, User.role == UserRole.DOCTOR)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return user
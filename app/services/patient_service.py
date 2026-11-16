from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.user import User, UserRole
from app.models.patient import PatientProfile
from app.schemas.patient import PatientUpdate


def get_patient_by_user_id(db: Session, user_id: int) -> User:
    user = (
        db.query(User)
        .options(joinedload(User.patient_profile))
        .filter(User.id == user_id, User.role == UserRole.PATIENT)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Patient not found")
    return user


def list_patients(db: Session) -> list[User]:
    return (
        db.query(User)
        .options(joinedload(User.patient_profile))
        .filter(User.role == UserRole.PATIENT)
        .order_by(User.id)
        .all()
    )


def update_patient(db: Session, user: User, data: PatientUpdate) -> User:
    if data.full_name is not None:
        user.full_name = data.full_name

    profile = user.patient_profile
    if not profile:
        profile = PatientProfile(user_id=user.id)
        db.add(profile)

    if data.phone is not None:
        profile.phone = data.phone
    if data.date_of_birth is not None:
        profile.date_of_birth = data.date_of_birth
    if data.address is not None:
        profile.address = data.address

    db.commit()
    db.refresh(user)
    return user
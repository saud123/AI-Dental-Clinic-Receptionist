from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.patient import PatientOut, PatientUpdate
from app.services.patient_service import (
    get_patient_by_user_id,
    list_patients,
    update_patient,
)

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/me", response_model=PatientOut)
def get_my_profile(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    user = get_patient_by_user_id(db, current_user.id)
    return PatientOut.from_user(user)


@router.patch("/me", response_model=PatientOut)
def update_my_profile(
    payload: PatientUpdate,
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    user = update_patient(db, current_user, payload)
    return PatientOut.from_user(user)


@router.get("", response_model=list[PatientOut])
def list_all_patients(
    _: User = Depends(require_role(UserRole.DOCTOR, UserRole.ASSISTANT)),
    db: Session = Depends(get_db),
):
    return [PatientOut.from_user(u) for u in list_patients(db)]


@router.get("/{patient_id}", response_model=PatientOut)
def get_one_patient(
    patient_id: int,
    _: User = Depends(require_role(UserRole.DOCTOR, UserRole.ASSISTANT)),
    db: Session = Depends(get_db),
):
    user = get_patient_by_user_id(db, patient_id)
    return PatientOut.from_user(user)
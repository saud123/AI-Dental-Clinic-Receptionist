from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.doctor import DoctorOut
from app.services.doctor_service import get_doctor, list_doctors

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.get("", response_model=list[DoctorOut])
def list_all_doctors(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [DoctorOut.from_user(u) for u in list_doctors(db)]


@router.get("/{doctor_id}", response_model=DoctorOut)
def get_one_doctor(
    doctor_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_doctor(db, doctor_id)
    return DoctorOut.from_user(user)
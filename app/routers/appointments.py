from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentReschedule,
    AvailabilityBlockCreate,
    AvailabilityBlockOut,
)
from app.services.appointment_service import (
    book_appointment,
    cancel_appointment,
    create_availability_block,
    get_appointment,
    list_all_appointments,
    list_my_appointments,
    reschedule_appointment,
)

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(
    payload: AppointmentCreate,
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    return book_appointment(db, current_user, payload)


@router.get("/me", response_model=list[AppointmentOut])
def my_appointments(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    return list_my_appointments(db, current_user.id)


@router.get("", response_model=list[AppointmentOut])
def all_appointments(
    _: User = Depends(require_role(UserRole.DOCTOR, UserRole.ASSISTANT)),
    db: Session = Depends(get_db),
):
    return list_all_appointments(db)


@router.get("/{appointment_id}", response_model=AppointmentOut)
def one_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_appointment(db, appointment_id, current_user)


@router.patch("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return cancel_appointment(db, appointment_id, current_user)


@router.patch("/{appointment_id}/reschedule", response_model=AppointmentOut)
def reschedule(
    appointment_id: int,
    payload: AppointmentReschedule,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return reschedule_appointment(db, appointment_id, payload.scheduled_at, current_user)


@router.post("/availability-blocks", response_model=AvailabilityBlockOut, status_code=201)
def mark_unavailable(
    payload: AvailabilityBlockCreate,
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.ASSISTANT)),
    db: Session = Depends(get_db),
):
    # Assistants can block any doctor via a query param later; for now, block for self if doctor
    doctor_id = current_user.id if current_user.role == UserRole.DOCTOR else current_user.id
    block, affected_ids = create_availability_block(db, doctor_id, payload)
    out = AvailabilityBlockOut.model_validate(block)
    out.affected_appointment_ids = affected_ids
    return out
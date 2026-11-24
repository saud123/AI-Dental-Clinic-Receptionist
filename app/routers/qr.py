from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import require_role
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User, UserRole
from app.schemas.qr import QrOut, QrResolveIn, QrResolved
from app.services import qr_service

router = APIRouter(prefix="/qr", tags=["qr"])


@router.get("/me", response_model=QrOut)
def get_my_qr(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    token, data_url = qr_service.generate_qr_image_base64(db, current_user.id)
    return QrOut(token=token, image=data_url)


@router.post("/me/revoke", status_code=status.HTTP_204_NO_CONTENT)
def revoke_my_qr(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    qr_service.revoke_token(db, current_user.id)
    return None


@router.post("/resolve", response_model=QrResolved)
def resolve_qr(
    payload: QrResolveIn,
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.ASSISTANT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    token = payload.token.strip().strip('"').strip("'")
    patient_user = qr_service.resolve_token(db, token)
    phone = patient_user.patient_profile.phone if patient_user.patient_profile else None

    now = datetime.now(timezone.utc)
    next_appt = (
        db.query(Appointment.scheduled_at)
        .filter(
            Appointment.patient_id == patient_user.id,
            Appointment.status.in_([AppointmentStatus.BOOKED, AppointmentStatus.RESCHEDULED]),
            Appointment.scheduled_at >= now,
        )
        .order_by(Appointment.scheduled_at)
        .first()
    )

    return QrResolved(
        patient_id=patient_user.id,
        full_name=patient_user.full_name,
        email=patient_user.email,
        phone=phone,
        next_appointment_at=next_appt[0] if next_appt else None,
    )

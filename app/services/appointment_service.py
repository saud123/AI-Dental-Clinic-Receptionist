from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import AvailabilityBlock
from app.models.user import User, UserRole
from app.schemas.appointment import (
    AppointmentCreate,
    AvailabilityBlockCreate,
)


def _check_availability(
    db: Session, doctor_id: int, start: datetime, duration_minutes: int, exclude_id: int | None = None
) -> None:
    """Raise 409 if the requested slot conflicts with a block or existing booking."""
    end = start + timedelta(minutes=duration_minutes)

    # 1. Overlaps an availability block?
    block = (
        db.query(AvailabilityBlock)
        .filter(
            AvailabilityBlock.doctor_id == doctor_id,
            AvailabilityBlock.start_time < end,
            AvailabilityBlock.end_time > start,
        )
        .first()
    )
    if block:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Doctor unavailable in that window ({block.reason or 'blocked'})",
        )

    # 2. Overlaps an existing booked appointment?
    q = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status.in_(
            [AppointmentStatus.BOOKED, AppointmentStatus.RESCHEDULED]
        ),
        Appointment.scheduled_at < end,
    )
    if exclude_id:
        q = q.filter(Appointment.id != exclude_id)
    for appt in q.all():
        if appt.scheduled_at + timedelta(minutes=appt.duration_minutes) > start:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Time slot already booked",
            )


def book_appointment(db: Session, patient: User, data: AppointmentCreate) -> Appointment:
    if data.scheduled_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot book in the past")

    # Doctor must exist, be a doctor, and be available
    doctor = (
        db.query(User)
        .filter(User.id == data.doctor_id, User.role == UserRole.DOCTOR, User.is_active.is_(True))
        .first()
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if doctor.doctor_profile and not doctor.doctor_profile.is_available:
        raise HTTPException(status_code=409, detail="Doctor is currently unavailable")

    _check_availability(db, data.doctor_id, data.scheduled_at, data.duration_minutes)

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=data.doctor_id,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes,
        status=AppointmentStatus.BOOKED,
        notes=data.notes,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


def list_my_appointments(db: Session, patient_id: int) -> list[Appointment]:
    return (
        db.query(Appointment)
        .filter(Appointment.patient_id == patient_id)
        .order_by(Appointment.scheduled_at.desc())
        .all()
    )


def list_all_appointments(db: Session) -> list[Appointment]:
    return db.query(Appointment).order_by(Appointment.scheduled_at.desc()).all()


def get_appointment(db: Session, appointment_id: int, current_user: User) -> Appointment:
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if current_user.role == UserRole.PATIENT and appt.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your appointment")
    return appt


def cancel_appointment(db: Session, appointment_id: int, current_user: User) -> Appointment:
    appt = get_appointment(db, appointment_id, current_user)
    if appt.status in (AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED):
        raise HTTPException(status_code=400, detail=f"Cannot cancel (status={appt.status.value})")
    appt.status = AppointmentStatus.CANCELLED
    db.commit()
    db.refresh(appt)
    return appt


def reschedule_appointment(
    db: Session, appointment_id: int, new_time: datetime, current_user: User
) -> Appointment:
    appt = get_appointment(db, appointment_id, current_user)
    if appt.status in (AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED):
        raise HTTPException(status_code=400, detail=f"Cannot reschedule (status={appt.status.value})")
    if new_time <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="New time is in the past")

    _check_availability(
        db, appt.doctor_id, new_time, appt.duration_minutes, exclude_id=appt.id
    )
    appt.scheduled_at = new_time
    appt.status = AppointmentStatus.RESCHEDULED
    db.commit()
    db.refresh(appt)
    return appt


def create_availability_block(
    db: Session, doctor_id: int, data: AvailabilityBlockCreate
) -> tuple[AvailabilityBlock, list[int]]:
    if data.end_time <= data.start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")

    block = AvailabilityBlock(
        doctor_id=doctor_id,
        start_time=data.start_time,
        end_time=data.end_time,
        reason=data.reason,
    )
    db.add(block)

    # Find overlapping booked appointments
    candidates = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == AppointmentStatus.BOOKED,
            Appointment.scheduled_at < data.end_time,
        )
        .all()
    )
    overlapping = [
        appt
        for appt in candidates
        if appt.scheduled_at + timedelta(minutes=appt.duration_minutes) > data.start_time
    ]
    affected_ids = []
    for appt in overlapping:
        appt.status = AppointmentStatus.RESCHEDULED_PENDING
        affected_ids.append(appt.id)

    db.commit()
    db.refresh(block)

    if affected_ids:
        try:
            from app.services import reminder_service
            reminder_service.create_reschedule_reminders_for_block(db, block, affected_ids)
        except Exception:
            pass

    return block, affected_ids
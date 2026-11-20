from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
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
# Email Service import karein (Path verify kar lein)
from app.services.email_service import EmailService 

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(
    payload: AppointmentCreate,
    background_tasks: BackgroundTasks, # <-- Added
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    appt = book_appointment(db, current_user, payload)

    # FETCH DOCTOR FOR EMAIL
    doctor = db.query(User).filter(User.id == payload.doctor_id).first()
    doctor_name = doctor.full_name if doctor else "your doctor"

    # SEND BOOKING EMAIL
    email_body = f"""
    <h2>Appointment Confirmed!</h2>
    <p>Dear {current_user.full_name},</p>
    <p>Your appointment with Dr. {doctor_name} is confirmed.</p>
    <p><strong>Date & Time:</strong> {appt.scheduled_at.strftime('%Y-%m-%d %I:%M %p')}</p>
    <p>Thank you for choosing Smile Dental.</p>
    """
    try:
        background_tasks.add_task(
            EmailService.send_email, # Use your exact method name (e.g., .send)
            to_email=current_user.email,
            subject="Appointment Confirmed - Smile Dental Clinic",
            body=email_body
        )
    except Exception as e:
        print(f"Email failed: {e}")

    return appt


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
    background_tasks: BackgroundTasks, # <-- Added
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = cancel_appointment(db, appointment_id, current_user)

    # SEND CANCELLATION EMAIL
    patient = db.query(User).filter(User.id == appt.patient_id).first()
    doctor = db.query(User).filter(User.id == appt.doctor_id).first()
    
    if patient and patient.email:
        email_body = f"""
        <h2>Appointment Cancelled/Rescheduled</h2>
        <p>Dear {patient.full_name},</p>
        <p>We regret to inform you that your appointment with Dr. {doctor.full_name if doctor else 'your doctor'} scheduled for {appt.scheduled_at.strftime('%Y-%m-%d %I:%M %p')} has been cancelled.</p>
        <p>Please log in to the patient portal to book a new slot.</p>
        """
        try:
            background_tasks.add_task(
                EmailService.send_email,
                to_email=patient.email,
                subject="Important: Appointment Update - Smile Dental",
                body=email_body
            )
        except Exception as e:
            print(f"Email failed: {e}")

    return appt


@router.patch("/{appointment_id}/reschedule", response_model=AppointmentOut)
def reschedule(
    appointment_id: int,
    payload: AppointmentReschedule,
    background_tasks: BackgroundTasks, # <-- Added
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = reschedule_appointment(db, appointment_id, payload.scheduled_at, current_user)

    # SEND RESCHEDULE EMAIL
    patient = db.query(User).filter(User.id == appt.patient_id).first()
    doctor = db.query(User).filter(User.id == appt.doctor_id).first()
    
    if patient and patient.email:
        email_body = f"""
        <h2>Appointment Rescheduled</h2>
        <p>Dear {patient.full_name},</p>
        <p>Your appointment with Dr. {doctor.full_name if doctor else 'your doctor'} has been rescheduled.</p>
        <p><strong>New Date & Time:</strong> {appt.scheduled_at.strftime('%Y-%m-%d %I:%M %p')}</p>
        <p>Please log in to the patient portal if you have any questions.</p>
        """
        try:
            background_tasks.add_task(
                EmailService.send_email,
                to_email=patient.email,
                subject="Appointment Rescheduled - Smile Dental",
                body=email_body
            )
        except Exception as e:
            print(f"Email failed: {e}")

    return appt


@router.post("/availability-blocks", response_model=AvailabilityBlockOut, status_code=201)
def mark_unavailable(
    payload: AvailabilityBlockCreate,
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.ASSISTANT)),
    db: Session = Depends(get_db),
):
    doctor_id = current_user.id if current_user.role == UserRole.DOCTOR else current_user.id
    block, affected_ids = create_availability_block(db, doctor_id, payload)
    out = AvailabilityBlockOut.model_validate(block)
    out.affected_appointment_ids = affected_ids
    return out
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.thread import (
    DoctorThreadDetail,
    DoctorThreadOut,
    HandoffRequest,
    ThreadMessageCreate,
    ThreadMessageOut,
)
from app.services import handoff_service

router = APIRouter(prefix="/threads", tags=["threads"])


@router.post("/handoff", response_model=DoctorThreadOut)
def request_handoff(
    payload: HandoffRequest,
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    return handoff_service.request_handoff(
        db=db,
        patient=current_user,
        doctor_id=payload.doctor_id,
        session_id=payload.session_id,
        appointment_id=payload.appointment_id,
    )


@router.get("/me", response_model=list[DoctorThreadOut])
def my_threads(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    return handoff_service.list_patient_threads(db, current_user)


@router.get("", response_model=list[DoctorThreadOut])
def list_threads(
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.ASSISTANT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    return handoff_service.list_doctor_threads(db, current_user)


@router.get("/{id}", response_model=DoctorThreadDetail)
def get_thread(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = handoff_service.get_thread(db, id, current_user)
    patient = db.query(User).filter(User.id == thread.patient_id).first()
    doctor = db.query(User).filter(User.id == thread.doctor_id).first()

    return DoctorThreadDetail(
        id=thread.id,
        session_id=thread.session_id,
        appointment_id=thread.appointment_id,
        patient_id=thread.patient_id,
        doctor_id=thread.doctor_id,
        summary_text=thread.summary_text,
        status=thread.status,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        patient_name=patient.full_name if patient else "",
        doctor_name=doctor.full_name if doctor else "",
        messages=thread.messages,
    )


@router.post("/{id}/messages", response_model=ThreadMessageOut)
def reply_to_thread(
    id: int,
    payload: ThreadMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.PATIENT:
        return handoff_service.patient_reply(db, id, current_user, payload.content)
    elif current_user.role in (UserRole.DOCTOR, UserRole.ADMIN):
        return handoff_service.doctor_reply(db, id, current_user, payload.content)
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

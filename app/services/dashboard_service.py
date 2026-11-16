from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentStatus
from app.models.review import Review
from app.models.thread import DoctorThread, DoctorThreadStatus
from app.models.user import User, UserRole


def get_dashboard(db: Session, current_user: User) -> dict:
    """Compute KPI metrics and list actionable pending threads."""
    now = datetime.now(timezone.utc)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    start_of_today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    start_of_tomorrow = start_of_today + timedelta(days=1)
    start_of_week = start_of_today - timedelta(days=now.weekday())
    end_of_week = start_of_week + timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    # 1. Total Patients
    total_patients = (
        db.query(func.count(User.id)).filter(User.role == UserRole.PATIENT).scalar() or 0
    )
    new_this_month = (
        db.query(func.count(User.id))
        .filter(User.role == UserRole.PATIENT, User.created_at >= first_of_month)
        .scalar()
        or 0
    )

    # 2. Appointments (scope to doctor if DOCTOR, clinic-wide if ASSISTANT/ADMIN)
    appt_base = db.query(Appointment)
    if current_user.role == UserRole.DOCTOR:
        appt_base = appt_base.filter(Appointment.doctor_id == current_user.id)

    today_count = (
        appt_base.filter(
            Appointment.scheduled_at >= start_of_today,
            Appointment.scheduled_at < start_of_tomorrow,
        ).count()
    )
    this_week_count = (
        appt_base.filter(
            Appointment.scheduled_at >= start_of_week,
            Appointment.scheduled_at < end_of_week,
        ).count()
    )

    completed_30d = (
        appt_base.filter(
            Appointment.scheduled_at >= thirty_days_ago,
            Appointment.status == AppointmentStatus.COMPLETED,
        ).count()
    )
    cancelled_30d = (
        appt_base.filter(
            Appointment.scheduled_at >= thirty_days_ago,
            Appointment.status == AppointmentStatus.CANCELLED,
        ).count()
    )
    completion_denom = completed_30d + cancelled_30d
    completion_rate_30d = round(completed_30d / completion_denom, 2) if completion_denom > 0 else 0.0

    # 3. Pending Threads
    thread_base = db.query(DoctorThread).filter(
        DoctorThread.status == DoctorThreadStatus.WAITING_FOR_DOCTOR
    )
    if current_user.role == UserRole.DOCTOR:
        thread_base = thread_base.filter(DoctorThread.doctor_id == current_user.id)

    pending_threads_count = thread_base.count()

    top_threads = thread_base.order_by(DoctorThread.created_at.desc()).limit(5).all()
    pending_items = []
    for t in top_threads:
        patient = db.query(User).filter(User.id == t.patient_id).first()
        summary_preview = (t.summary_text or "")[:100]
        pending_items.append(
            {
                "id": t.id,
                "patient_name": patient.full_name if patient else "Unknown Patient",
                "summary_preview": summary_preview,
                "created_at": t.created_at,
            }
        )

    # 4. Rating
    avg_all = db.query(func.avg(Review.rating)).filter(Review.rating.isnot(None)).scalar()
    count_all = db.query(func.count(Review.id)).filter(Review.rating.isnot(None)).scalar() or 0
    avg_30d = (
        db.query(func.avg(Review.rating))
        .filter(Review.rating.isnot(None), Review.created_at >= thirty_days_ago)
        .scalar()
    )
    rating_avg = round(float(avg_all), 2) if avg_all is not None else 0.0
    rating_30d_avg = round(float(avg_30d), 2) if avg_30d is not None else 0.0

    return {
        "kpis": {
            "total_patients": {
                "total": total_patients,
                "new_this_month": new_this_month,
            },
            "appointments": {
                "today": today_count,
                "this_week": this_week_count,
                "completion_rate_30d": completion_rate_30d,
            },
            "pending_threads": pending_threads_count,
            "rating": {
                "average": rating_avg,
                "count": count_all,
                "last_30d_average": rating_30d_avg,
            },
        },
        "pending_threads": pending_items,
    }

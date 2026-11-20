"""Seed script — insert test data into the database.

Run from project root:
    python -m app.db.seed

Idempotent: if admin@dentalclinic.com exists, it skips.
"""
from datetime import datetime, timedelta, timezone, date

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile, AvailabilityBlock
from app.models.appointment import Appointment, AppointmentStatus


def seed() -> None:
    db: Session = SessionLocal()
    try:
        # Idempotency: if admin exists, skip
        if db.query(User).filter(User.email == "admin@dentalclinic.com").first():
            print("Seed skipped — admin@dentalclinic.com already exists.")
            return

        # 1. Admin
        admin = User(
            email="admin@dentalclinic.com",
            hashed_password=hash_password("admin123"),
            full_name="Clinic Admin",
            role=UserRole.ADMIN,
        )
        db.add(admin)

        # 2. Doctors
        dr_ahmed_user = User(
            email="ahmed@dentalclinic.com",
            hashed_password=hash_password("doctor123"),
            full_name="Dr. Ahmed Khan",
            role=UserRole.DOCTOR,
        )
        dr_sara_user = User(
            email="sara@dentalclinic.com",
            hashed_password=hash_password("doctor123"),
            full_name="Dr. Sara Malik",
            role=UserRole.DOCTOR,
        )
        db.add_all([dr_ahmed_user, dr_sara_user])
        db.flush()  # assigns IDs

        db.add_all([
            DoctorProfile(
                user_id=dr_ahmed_user.id,
                specialty="Orthodontics",
                bio="12 years experience, braces and aligners specialist.",
                working_hours="Mon-Fri 9am-5pm",
                is_available=True,
                price = 200,
            ),
            DoctorProfile(
                user_id=dr_sara_user.id,
                specialty="General Dentistry",
                bio="General checkups, cleanings, fillings.",
                working_hours="Mon-Sat 10am-6pm",
                is_available=True,
                price = 100,
            ),
        ])

        # 3. Assistant
        db.add(
            User(
                email="assistant@dentalclinic.com",
                hashed_password=hash_password("assistant123"),
                full_name="Front Desk Assistant",
                role=UserRole.ASSISTANT,
            )
        )

        # 4. Patients
        patient_seed = [
            ("ali@example.com", "Ali Hassan", "+923001234567", date(1990, 5, 12)),
            ("fatima@example.com", "Fatima Zafar", "+923009876543", date(1985, 11, 3)),
            ("usman@example.com", "Usman Tariq", "+923007654321", date(2000, 2, 20)),
        ]
        patient_ids: list[int] = []
        for email, name, phone, dob in patient_seed:
            u = User(
                email=email,
                hashed_password=hash_password("patient123"),
                full_name=name,
                role=UserRole.PATIENT,
            )
            db.add(u)
            db.flush()
            db.add(
                PatientProfile(
                    user_id=u.id,
                    phone=phone,
                    date_of_birth=dob,
                    address="Lahore, Pakistan",
                )
            )
            patient_ids.append(u.id)

        # 5. Sample appointments
        now = datetime.now(timezone.utc)
        db.add_all([
            Appointment(
                patient_id=patient_ids[0],
                doctor_id=dr_ahmed_user.id,
                scheduled_at=now + timedelta(days=2, hours=3),
                duration_minutes=30,
                status=AppointmentStatus.BOOKED,
                notes="Initial consultation for braces",
            ),
            Appointment(
                patient_id=patient_ids[1],
                doctor_id=dr_sara_user.id,
                scheduled_at=now + timedelta(days=5, hours=1),
                duration_minutes=30,
                status=AppointmentStatus.BOOKED,
                notes="Routine cleaning",
            ),
        ])

        # 6. Sample availability block (for auto-reschedule testing later)
        db.add(
            AvailabilityBlock(
                doctor_id=dr_ahmed_user.id,
                start_time=now + timedelta(days=7, hours=9),
                end_time=now + timedelta(days=7, hours=17),
                reason="Continuing education day",
            )
        )

        db.commit()
        print("✅ Seed completed.")
        print("  Admin:     admin@dentalclinic.com     / admin123")
        print("  Doctors:   ahmed@dentalclinic.com     / doctor123")
        print("             sara@dentalclinic.com      / doctor123")
        print("  Assistant: assistant@dentalclinic.com / assistant123")
        print("  Patients:  ali@example.com            / patient123")
        print("             fatima@example.com         / patient123")
        print("             usman@example.com          / patient123")
    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
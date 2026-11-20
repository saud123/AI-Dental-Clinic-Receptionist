from fastapi import FastAPI
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
load_dotenv()  
from app.core.config import settings
from app.db.session import SessionLocal
from app.routers import (
    appointments,
    auth,
    chat,
    dashboard,
    doctors,
    patients,
    qr,
    reviews,
    threads,
    voice,
    voice_chat,          # <- Sirf yahan import hai, bilkul sahi
    notifications,
)
from app.services.reminder_service import send_due_reminders


def scheduled_reminders_job():
    """Background task to send due reminders using an isolated DB session."""
    db = SessionLocal()
    try:
        send_due_reminders(db)
    except Exception as e:
        print(f"[Scheduler Error] Failed to send reminders: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = BackgroundScheduler()
    scheduler.add_job(scheduled_reminders_job, "interval", minutes=15)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, lifespan=lifespan)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(patients.router, prefix="/api/v1")
app.include_router(doctors.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(threads.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(qr.router, prefix="/api/v1")
app.include_router(voice.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")

# Naya Voice Chat Router sirf ek dafa, app create hone ke baad add hoga
app.include_router(voice_chat.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
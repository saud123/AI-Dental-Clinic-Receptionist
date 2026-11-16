from fastapi import FastAPI
from app.core.config import settings
from app.routers import appointments, auth, chat, doctors, patients
app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(patients.router, prefix="/api/v1")
app.include_router(doctors.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}

from fastapi import FastAPI

from app.core.config import settings
from app.routers import auth

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)

app.include_router(auth.router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
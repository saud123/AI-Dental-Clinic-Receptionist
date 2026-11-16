from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import require_role
from app.models.user import User, UserRole
from app.schemas.dashboard import DashboardOut
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis", response_model=DashboardOut)
def get_dashboard_kpis(
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.ASSISTANT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    return dashboard_service.get_dashboard(db, current_user)

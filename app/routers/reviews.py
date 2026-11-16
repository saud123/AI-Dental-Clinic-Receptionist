from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import require_role
from app.models.user import User, UserRole
from app.schemas.chat import ChatSessionOut
from app.schemas.review import ReviewCreate, ReviewOut
from app.services import review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/pending", response_model=list[ChatSessionOut])
def list_pending_reviews(
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    return review_service.list_pending_reviews(db, current_user)


@router.post("", response_model=ReviewOut)
def submit_review(
    payload: ReviewCreate,
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    return review_service.submit_review(
        db=db,
        patient=current_user,
        session_id=payload.session_id,
        issue_solved=payload.issue_solved,
        rating=payload.rating,
        comment=payload.comment,
    )

from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ReviewCreate(BaseModel):
    session_id: int | None = None
    issue_solved: bool = True
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = None


class ReviewOut(BaseModel):
    id: int
    patient_id: int
    session_id: int | None = None
    issue_solved: bool | None = None
    rating: int | None = None
    comment: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

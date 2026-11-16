from datetime import datetime
from pydantic import BaseModel, ConfigDict


class KpiTotalPatients(BaseModel):
    total: int = 0
    new_this_month: int = 0


class KpiAppointments(BaseModel):
    today: int = 0
    this_week: int = 0
    completion_rate_30d: float = 0.0


class KpiRating(BaseModel):
    average: float = 0.0
    count: int = 0
    last_30d_average: float = 0.0


class DashboardKpis(BaseModel):
    total_patients: KpiTotalPatients
    appointments: KpiAppointments
    pending_threads: int = 0
    rating: KpiRating


class PendingThreadItem(BaseModel):
    id: int
    patient_name: str
    summary_preview: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DashboardOut(BaseModel):
    kpis: DashboardKpis
    pending_threads: list[PendingThreadItem] = []

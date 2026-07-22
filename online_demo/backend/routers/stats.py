from fastapi import APIRouter, Query
from sqlalchemy import func
from models import SessionLocal, AuditLog
from schemas import StatsOverview, TrendResponse
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/stats", tags=["stats"])


STATUS_MAP = {
    "approved": "APPROVED",
    "block": "BLOCKED",
    "warning": "WARNING",
}

def _normalize_status(s: str) -> str:
    return STATUS_MAP.get(s.lower(), s.upper())

@router.get("/overview", response_model=StatsOverview)
def overview():
    session = SessionLocal()
    try:
        total = session.query(AuditLog).count()
        approved = session.query(AuditLog).filter(
            AuditLog.review_status.in_(["approved"])
        ).count()
        blocked = session.query(AuditLog).filter(
            AuditLog.review_status.in_(["block"])
        ).count()
        warning = session.query(AuditLog).filter(
            AuditLog.review_status == "warning"
        ).count()

        today = datetime.now().strftime("%Y-%m-%d")
        today_total = session.query(AuditLog).filter(
            func.date(AuditLog.captured_at) == today
        ).count()
        today_approved = session.query(AuditLog).filter(
            func.date(AuditLog.captured_at) == today,
            AuditLog.review_status == "approved",
        ).count()
        today_blocked = session.query(AuditLog).filter(
            func.date(AuditLog.captured_at) == today,
            AuditLog.review_status == "block",
        ).count()

        unique_users = (
            session.query(AuditLog.userid)
            .filter(AuditLog.userid.isnot(None), AuditLog.userid != "")
            .distinct()
            .count()
        )

        return StatsOverview(
            total=total,
            approved=approved,
            blocked=blocked,
            warning=warning,
            today_total=today_total,
            today_approved=today_approved,
            today_blocked=today_blocked,
            unique_users=unique_users,
        )
    finally:
        session.close()


@router.get("/trend", response_model=TrendResponse)
def trend(days: int = Query(30, ge=1, le=365)):
    session = SessionLocal()
    try:
        cutoff = datetime.now() - timedelta(days=days)
        results = (
            session.query(
                func.date(AuditLog.captured_at).label("date"),
                AuditLog.review_status,
                func.count().label("cnt"),
            )
            .filter(AuditLog.captured_at >= cutoff)
            .group_by(func.date(AuditLog.captured_at), AuditLog.review_status)
            .all()
        )

        date_map: dict[str, dict[str, int]] = {}
        for date, status, cnt in results:
            if date not in date_map:
                date_map[date] = {"APPROVED": 0, "BLOCKED": 0, "WARNING": 0}
            key = _normalize_status(status)
            if key not in ("APPROVED", "BLOCKED", "WARNING"):
                key = "WARNING"
            date_map[date][key] += cnt

        dates = sorted(date_map.keys())
        return TrendResponse(
            dates=dates,
            approved=[date_map[d].get("APPROVED", 0) for d in dates],
            blocked=[date_map[d].get("BLOCKED", 0) for d in dates],
            warning=[date_map[d].get("WARNING", 0) for d in dates],
        )
    finally:
        session.close()

import re
from fastapi import APIRouter
from sqlalchemy import text
from models import SessionLocal
from schemas import ComplianceOverview, UserCompliance, ComplianceHeatmapItem, DepartmentCompliance

router = APIRouter(prefix="/api/compliance", tags=["compliance"])

CONTENT_CATEGORIES = [
    ("image_upload", r"\[Image Upload\]"),
    ("document_upload", r"\[PDF Upload\]"),
    ("office_document", r"\[OOXML Upload\]"),
    ("text_file_upload", r"\[Text File Upload"),
    ("command_execution", r"msiexec"),
]

def classify(msg: str) -> str:
    if not msg:
        return "conversation"
    for name, pattern in CONTENT_CATEGORIES:
        if re.search(pattern, msg):
            return name
    return "conversation"

@router.get("/overview", response_model=ComplianceOverview)
def overview():
    session = SessionLocal()
    try:
        r = session.execute(text("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN review_status='approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN review_status='block' THEN 1 ELSE 0 END) as blocked,
                SUM(CASE WHEN review_status='warning' THEN 1 ELSE 0 END) as warning
            FROM audit_logs
        """)).fetchone()

        total = r[0] or 0
        approved = r[1] or 0
        blocked = r[2] or 0
        warning = r[3] or 0

        user_count = session.execute(text("SELECT COUNT(DISTINCT userid) FROM audit_logs WHERE userid IS NOT NULL AND userid != ''")).scalar() or 0

        # Per-user risk
        users_raw = session.execute(text("""
            SELECT userid,
                COUNT(*) as total,
                SUM(CASE WHEN review_status='approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN review_status='block' THEN 1 ELSE 0 END) as blocked,
                SUM(CASE WHEN review_status='warning' THEN 1 ELSE 0 END) as warning
            FROM audit_logs
            WHERE userid IS NOT NULL AND userid != ''
            GROUP BY userid
        """)).fetchall()

        high_risk = 0
        total_risk = 0.0
        for u in users_raw:
            risk = (u[3] + u[4] * 0.5) / u[1] * 100 if u[1] > 0 else 0
            total_risk += risk
            if risk > 60:
                high_risk += 1

        avg_risk = round(total_risk / len(users_raw), 1) if users_raw else 0
        blocked_rate = round(blocked / total * 100, 1) if total > 0 else 0

        return ComplianceOverview(
            total_users=user_count,
            total_logs=total,
            high_risk_count=high_risk,
            avg_risk_score=avg_risk,
            blocked_rate=blocked_rate,
        )
    finally:
        session.close()

@router.get("/users", response_model=list[UserCompliance])
def users_compliance():
    session = SessionLocal()
    try:
        rows = session.execute(text("""
            SELECT userid, user_message, review_status FROM audit_logs
            WHERE userid IS NOT NULL AND userid != ''
        """)).fetchall()

        user_data: dict[str, dict] = {}
        for uid, msg, status in rows:
            if uid not in user_data:
                user_data[uid] = {"total": 0, "approved": 0, "blocked": 0, "warning": 0, "cats": {}}
            d = user_data[uid]
            d["total"] += 1
            if status == "approved": d["approved"] += 1
            elif status == "block": d["blocked"] += 1
            elif status == "warning": d["warning"] += 1
            cat = classify(msg)
            d["cats"][cat] = d["cats"].get(cat, 0) + 1

        results = []
        for uid, d in user_data.items():
            risk = round((d["blocked"] + d["warning"] * 0.5) / d["total"] * 100, 1) if d["total"] > 0 else 0
            results.append(UserCompliance(
                userid=uid, total=d["total"], approved=d["approved"],
                blocked=d["blocked"], warning=d["warning"],
                risk_score=risk, categories=d["cats"],
            ))
        return results
    finally:
        session.close()

@router.get("/heatmap", response_model=list[ComplianceHeatmapItem])
def heatmap():
    session = SessionLocal()
    try:
        rows = session.execute(text("""
            SELECT userid, user_message, review_status FROM audit_logs
            WHERE userid IS NOT NULL AND userid != ''
        """)).fetchall()

        matrix: dict[tuple[str, str], dict] = {}
        for uid, msg, status in rows:
            cat = classify(msg)
            key = (uid, cat)
            if key not in matrix:
                matrix[key] = {"total": 0, "approved": 0, "blocked": 0, "warning": 0}
            m = matrix[key]
            m["total"] += 1
            if status == "approved": m["approved"] += 1
            elif status == "block": m["blocked"] += 1
            elif status == "warning": m["warning"] += 1

        results = []
        for (uid, cat), m in matrix.items():
            risk = round((m["blocked"] + m["warning"] * 0.5) / m["total"] * 100, 1) if m["total"] > 0 else 0
            results.append(ComplianceHeatmapItem(
                userid=uid, category=cat, total=m["total"],
                approved=m["approved"], blocked=m["blocked"], warning=m["warning"],
                risk_score=risk,
            ))
        return results
    finally:
        session.close()

@router.get("/departments", response_model=list[DepartmentCompliance])
def departments():
    session = SessionLocal()
    try:
        rows = session.execute(text("""
            SELECT a.department, a.username, l.total, l.approved, l.blocked, l.warning
            FROM admin_users a
            LEFT JOIN (
                SELECT userid,
                    COUNT(*) as total,
                    SUM(CASE WHEN review_status='approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN review_status='block' THEN 1 ELSE 0 END) as blocked,
                    SUM(CASE WHEN review_status='warning' THEN 1 ELSE 0 END) as warning
                FROM audit_logs GROUP BY userid
            ) l ON a.username = l.userid
            WHERE a.role = 'user'
            ORDER BY a.department
        """)).fetchall()

        dept_map: dict[str, dict] = {}
        for dept, uid, total, approved, blocked, warning in rows:
            if dept not in dept_map:
                dept_map[dept] = {"users": set(), "total_logs": 0, "total_risk": 0.0, "high_risk": 0, "user_count": 0}
            d = dept_map[dept]
            d["users"].add(uid)
            t = total or 0
            a = approved or 0
            b = blocked or 0
            w = warning or 0
            d["total_logs"] += t
            risk = (b + w * 0.5) / t * 100 if t > 0 else 0
            d["total_risk"] += risk
            if risk > 60:
                d["high_risk"] += 1
            d["user_count"] += 1

        results = []
        for dept, d in dept_map.items():
            results.append(DepartmentCompliance(
                department=dept,
                user_count=len(d["users"]),
                total_logs=d["total_logs"],
                avg_risk_score=round(d["total_risk"] / d["user_count"], 1) if d["user_count"] > 0 else 0,
                high_risk_ratio=round(d["high_risk"] / d["user_count"] * 100, 1) if d["user_count"] > 0 else 0,
            ))
        return results
    finally:
        session.close()

from fastapi import APIRouter, HTTPException, Query
from models import SessionLocal, text
from schemas import SiteEntry, SiteUpdate, SiteListResponse

router = APIRouter(prefix="/api/sites", tags=["sites"])

@router.get("", response_model=SiteListResponse)
def list_sites(
    q: str = Query(None),
    is_ai: int = Query(None),
    is_authorized: int = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    session = SessionLocal()
    try:
        sql = "SELECT domain, is_ai, is_authorized, search_summary, discovered_at, reviewed_by, reviewed_at, classification_reason FROM site_registry WHERE 1=1"
        params = {}
        if q:
            sql += " AND domain LIKE :q"
            params["q"] = f"%{q}%"
        if is_ai is not None:
            sql += " AND is_ai = :is_ai"
            params["is_ai"] = is_ai
        if is_authorized is not None:
            sql += " AND is_authorized = :is_authorized"
            params["is_authorized"] = is_authorized

        count_sql = sql.replace("SELECT domain, is_ai, is_authorized, search_summary, discovered_at, reviewed_by, reviewed_at, classification_reason", "SELECT COUNT(*)")
        total = session.execute(text(count_sql), params).scalar()

        sql += " ORDER BY domain ASC LIMIT :limit OFFSET :offset"
        params["limit"] = size
        params["offset"] = (page - 1) * size
        rows = session.execute(text(sql), params).fetchall()

        records = [
            SiteEntry(
                domain=r[0], is_ai=r[1], is_authorized=r[2],
                search_summary=r[3] or "", discovered_at=str(r[4] or ""),
                reviewed_by=r[5] or "", reviewed_at=str(r[6] or "") if r[6] else None,
                classification_reason=r[7] or "",
            )
            for r in rows
        ]
        return SiteListResponse(records=records, total=total)
    finally:
        session.close()

@router.get("/{domain}", response_model=SiteEntry)
def get_site(domain: str):
    session = SessionLocal()
    try:
        r = session.execute(
            text("SELECT domain, is_ai, is_authorized, search_summary, discovered_at, reviewed_by, reviewed_at, classification_reason, tavily_raw FROM site_registry WHERE domain = :d"),
            {"d": domain},
        ).fetchone()
        if not r:
            raise HTTPException(404, "Site not found")
        return SiteEntry(
            domain=r[0], is_ai=r[1], is_authorized=r[2],
            search_summary=r[3] or "", discovered_at=str(r[4] or ""),
            reviewed_by=r[5] or "", reviewed_at=str(r[6] or "") if r[6] else None,
            classification_reason=r[7] or "", tavily_raw=r[8] or "",
        )
    finally:
        session.close()

@router.put("/{domain}")
def update_site(domain: str, body: SiteUpdate):
    session = SessionLocal()
    try:
        existing = session.execute(
            text("SELECT domain FROM site_registry WHERE domain = :d"),
            {"d": domain},
        ).fetchone()
        if not existing:
            raise HTTPException(404, "Site not found")
        if body.is_authorized is not None:
            session.execute(
                text("UPDATE site_registry SET is_authorized = :v, reviewed_by = :u, reviewed_at = datetime('now') WHERE domain = :d"),
                {"v": body.is_authorized, "u": "admin", "d": domain},
            )
            session.commit()
        return {"status": "ok"}
    finally:
        session.close()

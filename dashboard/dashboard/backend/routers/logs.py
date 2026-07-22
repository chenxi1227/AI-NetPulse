import re, io, csv
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from sqlalchemy import func
from models import SessionLocal, AuditLog, FileRecord
from schemas import LogEntry, LogDetail, LogListResponse, FileRecordItem

router = APIRouter(prefix="/api/logs", tags=["logs"])

VALID_STATUSES = {"approved", "block", "warning"}
STATUS_TO_DB = {"APPROVED": "approved", "BLOCKED": "block", "WARNING": "warning"}
DB_TO_STATUS = {v: k for k, v in STATUS_TO_DB.items()}

def _match_files(session, log):
    if not log.user_message:
        return []
    m = re.search(r"Size:\s*(\d+)", log.user_message)
    if not m:
        return []
    file_size = int(m.group(1))
    records = session.query(FileRecord).filter(
        FileRecord.userid == log.userid,
        FileRecord.file_size == file_size,
    ).order_by(
        func.abs(func.julianday(FileRecord.captured_at) - func.julianday(log.captured_at))
    ).limit(1).all()
    return [
        FileRecordItem(
            id=r.id,
            file_name=r.file_name or "",
            file_type=r.file_type or "",
            mime_type=r.mime_type or "",
            file_size=r.file_size or 0,
            extracted_text=r.extracted_text or "",
            review_status=DB_TO_STATUS.get(r.review_status, r.review_status.upper()),
            captured_at=str(r.captured_at or ""),
        )
        for r in records
    ]

def _to_log_entry(r):
    return LogEntry(
        id=r.id, request_id="",
        userid=r.userid or "", user_ip=r.user_ip or "",
        user_message=(r.user_message or "")[:200],
        review_status=DB_TO_STATUS.get(r.review_status, r.review_status.upper()),
        review_reason=r.review_reason or "",
        raw_ai_json=r.raw_ai_json or "",
        model_name="", model_version="",
        captured_at=str(r.captured_at or ""),
    )


@router.get("", response_model=LogListResponse)
def list_logs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    user: str = Query(None),
    start: str = Query(None),
    end: str = Query(None),
    search: str = Query(None),
    sort: str = Query("newest"),
):
    session = SessionLocal()
    try:
        query = session.query(AuditLog).filter(AuditLog.review_status.in_(VALID_STATUSES))
        if status:
            db_val = STATUS_TO_DB.get(status.upper())
            if db_val:
                query = query.filter(AuditLog.review_status == db_val)
        if user:
            query = query.filter(AuditLog.userid == user)
        if start:
            query = query.filter(AuditLog.captured_at >= start)
        if end:
            query = query.filter(AuditLog.captured_at <= end + " 23:59:59")
        if search:
            query = query.filter(AuditLog.user_message.contains(search))

        total = query.count()
        order = AuditLog.id.desc() if sort == "newest" else AuditLog.id.asc()
        records = query.order_by(order).offset((page - 1) * size).limit(size).all()

        return LogListResponse(
            records=[_to_log_entry(r) for r in records],
            total=total, page=page, size=size,
        )
    finally:
        session.close()


@router.get("/export/csv")
def export_csv(
    status: str = Query(None),
    user: str = Query(None),
    start: str = Query(None),
    end: str = Query(None),
    search: str = Query(None),
):
    session = SessionLocal()
    try:
        query = session.query(AuditLog).filter(AuditLog.review_status.in_(VALID_STATUSES))
        if status:
            db_val = STATUS_TO_DB.get(status.upper())
            if db_val:
                query = query.filter(AuditLog.review_status == db_val)
        if user:
            query = query.filter(AuditLog.userid == user)
        if start:
            query = query.filter(AuditLog.captured_at >= start)
        if end:
            query = query.filter(AuditLog.captured_at <= end + " 23:59:59")
        if search:
            query = query.filter(AuditLog.user_message.contains(search))

        records = query.order_by(AuditLog.id.desc()).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "User", "IP", "Message", "Status", "Reason", "Time"])
        for r in records:
            writer.writerow([
                r.id, r.userid, r.user_ip, r.user_message,
                DB_TO_STATUS.get(r.review_status, r.review_status.upper()),
                r.review_reason, str(r.captured_at),
            ])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
        )
    finally:
        session.close()


@router.get("/{log_id}", response_model=LogDetail)
def get_log(log_id: int):
    session = SessionLocal()
    try:
        log = session.query(AuditLog).filter_by(id=log_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")
        return LogDetail(
            id=log.id, request_id="",
            userid=log.userid or "", user_ip=log.user_ip or "",
            user_message=log.user_message or "",
            review_status=DB_TO_STATUS.get(log.review_status, log.review_status.upper()),
            review_reason=log.review_reason or "",
            raw_ai_json=log.raw_ai_json or "",
            model_name="", model_version="",
            captured_at=str(log.captured_at or ""),
            files=_match_files(session, log),
        )
    finally:
        session.close()


@router.get("/{log_id}/files/{file_id}/download")
def download_file(log_id: int, file_id: int):
    session = SessionLocal()
    try:
        file_rec = session.query(FileRecord).filter_by(id=file_id).first()
        if not file_rec or not file_rec.file_data:
            raise HTTPException(status_code=404, detail="File not found")
        mime = file_rec.mime_type or "application/octet-stream"
        name = file_rec.file_name or f"file_{file_id}"
        return Response(
            content=file_rec.file_data,
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{name}"'},
        )
    finally:
        session.close()

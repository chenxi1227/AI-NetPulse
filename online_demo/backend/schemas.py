from pydantic import BaseModel, Field
from typing import Optional

# Auth

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

# File Records

class FileRecordItem(BaseModel):
    id: int
    file_name: str
    file_type: str
    mime_type: str
    file_size: int
    extracted_text: str
    review_status: str
    captured_at: str

# Logs

class LogEntry(BaseModel):
    id: int
    request_id: str
    userid: str
    user_ip: str
    user_message: str
    review_status: str
    review_reason: str
    raw_ai_json: str
    model_name: str
    model_version: str
    captured_at: str

    class Config:
        from_attributes = True

class LogDetail(LogEntry):
    files: list[FileRecordItem] = []

class LogListResponse(BaseModel):
    records: list[LogEntry]
    total: int
    page: int
    size: int

# Stats

class StatsOverview(BaseModel):
    total: int
    approved: int
    blocked: int
    warning: int
    today_total: int
    today_approved: int
    today_blocked: int
    unique_users: int

class TrendItem(BaseModel):
    date: str
    approved: int
    blocked: int
    warning: int

class TrendResponse(BaseModel):
    dates: list[str]
    approved: list[int]
    blocked: list[int]
    warning: list[int]

# Users

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"
    department: str = ""
    is_active: bool = True

class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
    department: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    department: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True

# Sites

class SiteEntry(BaseModel):
    domain: str
    is_ai: int
    is_authorized: int
    search_summary: str
    discovered_at: str
    reviewed_by: str
    reviewed_at: str | None
    classification_reason: str
    tavily_raw: str = ""

class SiteUpdate(BaseModel):
    is_authorized: int | None = None

class SiteListResponse(BaseModel):
    records: list[SiteEntry]
    total: int

# Compliance

class UserCompliance(BaseModel):
    userid: str
    total: int
    approved: int
    blocked: int
    warning: int
    risk_score: float
    categories: dict[str, int]

class ComplianceHeatmapItem(BaseModel):
    userid: str
    category: str
    total: int
    approved: int
    blocked: int
    warning: int
    risk_score: float

class ComplianceOverview(BaseModel):
    total_users: int
    total_logs: int
    high_risk_count: int
    avg_risk_score: float
    blocked_rate: float

class DepartmentCompliance(BaseModel):
    department: str
    user_count: int
    total_logs: int
    avg_risk_score: float
    high_risk_ratio: float

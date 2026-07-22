from fastapi import APIRouter, HTTPException
from models import SessionLocal, AdminUser
from schemas import LoginRequest, TokenResponse, RefreshRequest
from utils import verify_password, create_access_token, create_refresh_token, verify_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    session = SessionLocal()
    user = session.query(AdminUser).filter_by(username=body.username).first()
    session.close()
    if not user or not verify_password(body.password, user.password) or user.role != "admin":
        raise HTTPException(status_code=401, detail="Invalid credentials or account disabled")
    payload = {"sub": user.username, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest):
    payload = verify_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    new_payload = {"sub": payload["sub"], "role": payload.get("role", "user")}
    return TokenResponse(
        access_token=create_access_token(new_payload),
        refresh_token=create_refresh_token(new_payload),
    )

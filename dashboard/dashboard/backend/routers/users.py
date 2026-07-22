from fastapi import APIRouter, HTTPException
from models import SessionLocal, AdminUser
from schemas import UserCreate, UserUpdate, UserResponse
from utils import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users():
    session = SessionLocal()
    try:
        users = session.query(AdminUser).all()
        return [
            UserResponse(
                id=u.id,
                username=u.username,
                role=u.role or "user",
                department=u.department or "",
                is_active=u.is_active,
                created_at=str(u.created_at or ""),
            )
            for u in users
        ]
    finally:
        session.close()


@router.post("", response_model=UserResponse)
def create_user(body: UserCreate):
    session = SessionLocal()
    try:
        if session.query(AdminUser).filter_by(username=body.username).first():
            raise HTTPException(status_code=400, detail="Username already exists")
        user = AdminUser(
            username=body.username,
            password=hash_password(body.password),
            role=body.role,
            department=body.department,
            is_active=body.is_active,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return UserResponse(
            id=user.id,
            username=user.username,
            role=user.role or "user",
            department=user.department or "",
            is_active=user.is_active,
            created_at=str(user.created_at or ""),
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, body: UserUpdate):
    session = SessionLocal()
    try:
        user = session.query(AdminUser).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if body.is_active is not None:
            user.is_active = body.is_active
        if body.role is not None:
            user.role = body.role
        if body.department is not None:
            user.department = body.department
        session.commit()
        session.refresh(user)
        return UserResponse(
            id=user.id,
            username=user.username,
            role=user.role or "user",
            department=user.department or "",
            is_active=user.is_active,
            created_at=str(user.created_at or ""),
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete("/{user_id}")
def delete_user(user_id: int):
    session = SessionLocal()
    try:
        user = session.query(AdminUser).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.username == "admin":
            raise HTTPException(status_code=400, detail="Cannot delete default admin")
        session.delete(user)
        session.commit()
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

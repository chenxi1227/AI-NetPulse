import os
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, DateTime, func, text, Index, LargeBinary
)
from sqlalchemy.orm import declarative_base, sessionmaker
from config import DATABASE_URL

is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
if is_sqlite:
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))
        conn.execute(text("PRAGMA busy_timeout=5000"))
        conn.commit()

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(100), nullable=False)
    role = Column(String(20), default="user")
    department = Column(String(20), default="")
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    userid = Column(String(50))
    user_ip = Column(String(50))
    user_message = Column(Text)
    review_status = Column(String(20), nullable=False, default="PENDING")
    review_reason = Column(Text)
    raw_ai_json = Column(Text)
    captured_at = Column(DateTime)

class FileRecord(Base):
    __tablename__ = "file_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    userid = Column(String(50))
    user_ip = Column(String(50))
    file_name = Column(String(255))
    file_type = Column(String(20))
    mime_type = Column(String(100))
    file_size = Column(Integer)
    file_data = Column(LargeBinary)
    extracted_text = Column(Text)
    review_status = Column(String(20))
    review_reason = Column(Text)
    raw_ai_json = Column(Text)
    captured_at = Column(DateTime)

Index("idx_logs_status", AuditLog.review_status)
Index("idx_logs_captured_at", AuditLog.captured_at)
Index("idx_logs_userid", AuditLog.userid)

def init_db():
    Base.metadata.create_all(engine)
    from sqlalchemy import inspect
    inspector = inspect(engine)
    cols = [c['name'] for c in inspector.get_columns('admin_users')]
    if 'is_active' not in cols:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE admin_users ADD COLUMN is_active INTEGER DEFAULT 1"))
            conn.commit()
    session = SessionLocal()
    if not session.query(AdminUser).filter_by(username="admin").first():
        admin = AdminUser(
            username="admin",
            password="admin",
            role="admin",
            department="IT",
        )
        session.add(admin)
        session.commit()
    session.close()

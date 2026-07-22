import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Database file path (project.db in current dir)
DB_PATH = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'project.db')
ENGINE_URL = f'sqlite:///{DB_PATH}'

# 2. Create engine and base class
engine = create_engine(ENGINE_URL, echo=True) # echo=True prints SQL for debugging
Base = declarative_base()

# ==================== Table definitions ====================

# Table 1: Admin users (for Dashboard login)
class AdminUser(Base):
    __tablename__ = 'admin_users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(100), nullable=False) # login password
    created_at = Column(DateTime, default=datetime.now)

# Table 2: Captured user/business data
class CapturedData(Base):
    __tablename__ = 'captured_data'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    target_user_id = Column(String(50), unique=True, nullable=False) # captured user unique ID
    target_username = Column(String(100))                            # captured username
    raw_json = Column(Text)                                          # raw JSON payload (backup)
    captured_at = Column(DateTime, default=datetime.now)             # capture time

# ====================================================

# 3. Init DB
def init_database():
    # Auto-create project.db & tables
    Base.metadata.create_all(engine)
    
    # Create Session factory
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Seed a default admin account
    if not session.query(AdminUser).filter_by(username='admin').first():
        admin = AdminUser(username='admin', password='admin')
        session.add(admin)
        session.commit()
        print("\n[OK] Database initialized. Default admin: admin / admin")
    else:
        print("\n[i] Database already exists, skipping init.")
        
    session.close()

if __name__ == '__main__':
    init_database()

import os
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./tickets.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    session_token = Column(String, unique=True, index=True, nullable=True)
    magic_token = Column(String, nullable=True)
    magic_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True)
    email = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    departure = Column(String, nullable=True)
    budget = Column(Integer, nullable=True)
    needs_accommodation = Column(Boolean, default=False)
    status = Column(String, default="監控中")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TicketRecord(Base):
    __tablename__ = "ticket_records"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), index=True)
    zone = Column(String, nullable=True)         # e.g. "綠212區"
    price = Column(Float, nullable=True)          # e.g. 4880
    remaining = Column(Integer, nullable=True)    # e.g. 1
    raw_text = Column(String, nullable=True)      # Full raw text for display
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[Database] Warning: create_all encountered an error: {e}")
    # Tables that already exist will be fine; new tables may fail if DB is unreachable

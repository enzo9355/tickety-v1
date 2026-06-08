import os
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float, ForeignKey, text
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
    # Feature 2: ticket price filter
    min_price = Column(Integer, nullable=True)
    max_price = Column(Integer, nullable=True)
    # Feature 5: monitoring time window (hour 0-23, inclusive)
    monitor_start = Column(Integer, nullable=True)
    monitor_end = Column(Integer, nullable=True)


class TicketRecord(Base):
    __tablename__ = "ticket_records"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), index=True)
    zone = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    remaining = Column(Integer, nullable=True)
    raw_text = Column(String, nullable=True)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)


# Feature 6: multi-user task sharing
class TaskSharing(Base):
    __tablename__ = "task_sharings"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), index=True)
    email = Column(String, index=True)
    invited_at = Column(DateTime, default=datetime.datetime.utcnow)


# Feature 8: user preference tracking
class UserPreference(Base):
    __tablename__ = "user_preferences"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    artist = Column(String, nullable=True)
    venue = Column(String, nullable=True)
    track_count = Column(Integer, default=1)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)


try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[Database] Warning: create_all encountered an error: {e}")


def run_migrations():
    """Safely add new columns to existing tables (idempotent)."""
    additions = [
        ("tasks", "min_price",     "INTEGER"),
        ("tasks", "max_price",     "INTEGER"),
        ("tasks", "monitor_start", "INTEGER"),
        ("tasks", "monitor_end",   "INTEGER"),
    ]
    with engine.connect() as conn:
        for table, col, col_type in additions:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                conn.commit()
                print(f"[Migration] Added {table}.{col}")
            except Exception:
                pass  # Column already exists — safe to ignore


run_migrations()

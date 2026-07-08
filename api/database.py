"""
Database configuration for CivicSight API.

Security features:
- Connection pool limits to prevent DoS via connection exhaustion
- SSL enforcement for Postgres connections
- Proper session management with context-safe generator
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# We expect a DATABASE_URL environment variable from the user later (e.g. from AWS RDS)
# For local testing, fallback to a dummy SQLite DB if not provided, just so it doesn't crash on import
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./civicsight.db")

# Build engine kwargs based on database type
connect_args = {}
engine_kwargs = {}

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Postgres / production database settings
    engine_kwargs = {
        # Connection pool limits — prevent exhaustion attacks
        "pool_size": 10,          # Maximum persistent connections
        "max_overflow": 5,        # Extra connections allowed under burst
        "pool_timeout": 30,       # Seconds to wait for a connection before erroring
        "pool_recycle": 1800,     # Recycle connections after 30 min (prevents stale conn issues)
        "pool_pre_ping": True,    # Test connections before use (handles DB restarts gracefully)
    }

    # Enforce SSL for Postgres connections (AWS RDS requires this)
    connect_args = {"sslmode": "require"}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Dependency that yields a database session and ensures it is always closed,
    even if the request handler raises an exception.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

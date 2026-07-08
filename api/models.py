import enum
import uuid
from sqlalchemy import Column, String, Float, Enum, ForeignKey, JSON, DateTime, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class RoleEnum(str, enum.Enum):
    citizen = "citizen"
    staff = "staff"
    admin = "admin"

class PriorityEnum(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"

class StatusEnum(str, enum.Enum):
    submitted = "submitted"
    ai_processing = "ai_processing"
    needs_review = "needs_review"
    assigned = "assigned"
    in_progress = "in_progress"
    escalated = "escalated"
    resolved = "resolved"
    rejected = "rejected"

class Department(Base):
    __tablename__ = "departments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    category_tags = Column(JSON, default=list)

    users = relationship("User", back_populates="department")

class User(Base):
    __tablename__ = "users"

    # We will use Cognito's sub (UUID) as the primary key here for easy mapping
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.citizen, nullable=False)
    department_id = Column(String, ForeignKey("departments.id"), nullable=True)

    department = relationship("Department", back_populates="users")
    reports = relationship("Report", back_populates="citizen")

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    citizen_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    citizen_description = Column(Text, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    address = Column(String, nullable=True)
    zone = Column(Integer, nullable=True)
    ward = Column(Integer, nullable=True)
    image_url = Column(String, nullable=False)
    
    status = Column(Enum(StatusEnum), default=StatusEnum.submitted, nullable=False)
    priority = Column(Enum(PriorityEnum), nullable=True)
    category = Column(String, nullable=True)
    note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    citizen = relationship("User", back_populates="reports")

"""
Pydantic schemas for CivicSight API.

All string fields have explicit max_length constraints to prevent
oversized payloads. Coordinates are range-validated. Email fields
use Pydantic's built-in EmailStr validator.
"""

from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Optional, List
from datetime import datetime
from models import RoleEnum, PriorityEnum, StatusEnum
from security import validate_safe_text
from services.s3 import get_presigned_url

# ---------------------------------------------------------------------------
# Department Schemas
# ---------------------------------------------------------------------------

class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    category_tags: Optional[List[str]] = []

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return validate_safe_text(v, "name")

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: str
    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# User Schemas
# ---------------------------------------------------------------------------

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=200)
    role: RoleEnum
    department_id: Optional[str] = Field(None, max_length=100)

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str | None) -> str | None:
        if v is not None:
            return validate_safe_text(v, "full_name")
        return v

class UserPromote(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    role: RoleEnum
    department_id: Optional[str] = Field(None, max_length=100)

class UserResponse(UserBase):
    id: str
    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# Report Schemas
# ---------------------------------------------------------------------------

class ReportBase(BaseModel):
    citizen_description: Optional[str] = Field(None, max_length=5000)
    lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    address: Optional[str] = Field(None, max_length=500)
    zone: Optional[int] = Field(None, ge=1, le=10)
    ward: Optional[int] = Field(None, ge=1, le=70)

    @field_validator("citizen_description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is not None:
            return validate_safe_text(v, "citizen_description")
        return v

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: str | None) -> str | None:
        if v is not None:
            return validate_safe_text(v, "address")
        return v

class ReportCreate(ReportBase):
    image_url: str = Field(..., min_length=1, max_length=2048)

class ReportStatusUpdate(BaseModel):
    new_status: StatusEnum
    note: Optional[str] = Field(None, max_length=2000)

    @field_validator("note")
    @classmethod
    def validate_note(cls, v: str | None) -> str | None:
        if v is not None:
            return validate_safe_text(v, "note")
        return v

class ReportManualClassify(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    priority: PriorityEnum
    note: Optional[str] = Field(None, max_length=2000)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        return validate_safe_text(v, "category")

    @field_validator("note")
    @classmethod
    def validate_note(cls, v: str | None) -> str | None:
        if v is not None:
            return validate_safe_text(v, "note")
        return v

class ReportResponse(ReportBase):
    id: str
    citizen_id: str
    image_url: str

    @field_validator("image_url", mode="before")
    @classmethod
    def generate_presigned_url(cls, v: str) -> str:
        if v:
            return get_presigned_url(v)
        return v

    status: StatusEnum
    priority: Optional[PriorityEnum] = None
    category: Optional[str] = None
    note: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

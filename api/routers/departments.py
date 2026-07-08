"""
Departments router for CivicSight API.

Security: Rate limited.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Department
from schemas import DepartmentResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("/", response_model=List[DepartmentResponse])
@limiter.limit("30/minute")
def get_departments(
    request: Request,
    db: Session = Depends(get_db),
):
    return db.query(Department).all()

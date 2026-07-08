"""
Admin router for CivicSight API.

Security: All endpoints require admin/staff auth + rate limiting.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models import User, Report, RoleEnum, StatusEnum
from schemas import UserPromote, UserResponse, ReportStatusUpdate, ReportResponse
from auth import require_admin, require_staff
from services.state_machine import transition, InvalidTransitionError
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/users/promote", response_model=UserResponse)
@limiter.limit("5/minute")
def promote_user(
    promote_data: UserPromote,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == promote_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = promote_data.role
    if promote_data.department_id:
        user.department_id = promote_data.department_id

    db.commit()
    db.refresh(user)
    return user


@router.patch("/reports/{report_id}/status", response_model=ReportResponse)
@limiter.limit("20/minute")
def update_report_status(
    report_id: str,
    status_update: ReportStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    staff: User = Depends(require_staff),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    try:
        transition_result = transition(
            report.status, status_update.new_status, status_update.note
        )
        report.status = transition_result["new_status"]
        if transition_result["note"]:
            report.note = transition_result["note"]

        db.commit()
        db.refresh(report)
        return report
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

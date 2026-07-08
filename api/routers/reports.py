"""
Reports router for CivicSight API.

Security features:
- All endpoints require authentication
- Rate limiting on all routes
- Query parameter bounds (limit capped at 100, offset min 0)
"""

import json
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Report, User, StatusEnum, PriorityEnum
from schemas import ReportResponse
from auth import get_current_user
from services.s3 import upload_image_to_s3
from services.ai_classifier import classify_image
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/", response_model=List[ReportResponse])
@limiter.limit("30/minute")
def get_reports(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: Optional[StatusEnum] = None,
    limit: int = 50,
    offset: int = 0,
):
    # Clamp query parameters to safe bounds
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    query = db.query(Report)
    if status:
        query = query.filter(Report.status == status)
    return query.order_by(Report.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/my", response_model=List[ReportResponse])
@limiter.limit("30/minute")
def get_my_reports(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Report)
        .filter(Report.citizen_id == current_user.id)
        .order_by(Report.created_at.desc())
        .all()
    )


@router.get("/{report_id}", response_model=ReportResponse)
@limiter.limit("60/minute")
def get_report(
    report_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("/", response_model=ReportResponse)
@limiter.limit("5/minute")
async def create_report(
    request: Request,
    citizen_description: Optional[str] = Form(None),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    address: Optional[str] = Form(None),
    zone: Optional[int] = Form(None),
    ward: Optional[int] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate coordinate ranges (defense in depth — schemas also validate)
    if lat is not None and not (-90 <= lat <= 90):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
    if lng is not None and not (-180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")

    # Sanitize description length
    if citizen_description and len(citizen_description) > 5000:
        raise HTTPException(status_code=400, detail="Description too long (max 5000 characters)")
    if address and len(address) > 500:
        raise HTTPException(status_code=400, detail="Address too long (max 500 characters)")

    # Upload image to S3 (validated inside upload_image_to_s3)
    image_url = await upload_image_to_s3(file)

    # Classify the image with AI
    classification = classify_image(image_url, citizen_description)

    # Map AI priority to enum
    ai_priority = classification.get("priority", "medium")
    try:
        priority_enum = PriorityEnum(ai_priority)
    except ValueError:
        priority_enum = PriorityEnum.medium

    # Map validation
    is_valid = classification.get("is_valid_issue", True)
    initial_status = StatusEnum.needs_review if is_valid else StatusEnum.rejected

    note = json.dumps(
        {
            "ai_description": classification.get("ai_description"),
            "priority_reason": classification.get("priority_reason"),
            "confidence": classification.get("confidence"),
        }
    )

    # Save to DB
    new_report = Report(
        citizen_id=current_user.id,
        citizen_description=citizen_description,
        lat=lat,
        lng=lng,
        address=address,
        zone=zone,
        ward=ward,
        image_url=image_url,
        status=initial_status,
        priority=priority_enum,
        category=classification.get("category", "other"),
        note=note,
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return new_report

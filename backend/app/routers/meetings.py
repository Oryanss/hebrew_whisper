from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/api/cases/{case_id}/meetings",
    tags=["meetings"],
    dependencies=[Depends(security.get_current_user)],
)

standalone_router = APIRouter(
    prefix="/api/meetings", tags=["meetings"], dependencies=[Depends(security.get_current_user)]
)


def _get_case_or_404(case_id: int, db: Session) -> models.Case:
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    return case


@router.get("", response_model=List[schemas.MeetingOut])
def list_case_meetings(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return (
        db.query(models.Meeting)
        .filter(models.Meeting.case_id == case_id)
        .order_by(models.Meeting.start_time)
        .all()
    )


@router.post("", response_model=schemas.MeetingOut, status_code=201)
def create_meeting(case_id: int, meeting_in: schemas.MeetingCreate, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    meeting = models.Meeting(**meeting_in.model_dump(), case_id=case_id)
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@standalone_router.get("/upcoming", response_model=List[schemas.MeetingWithCaseOut])
def list_upcoming_meetings(days: int = 14, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    cutoff = now + timedelta(days=days)
    rows = (
        db.query(models.Meeting, models.Case)
        .join(models.Case, models.Meeting.case_id == models.Case.id)
        .filter(models.Meeting.start_time >= now)
        .filter(models.Meeting.start_time <= cutoff)
        .order_by(models.Meeting.start_time)
        .all()
    )
    return [
        schemas.MeetingWithCaseOut(
            id=m.id,
            title=m.title,
            start_time=m.start_time,
            end_time=m.end_time,
            location=m.location,
            attendees=m.attendees,
            notes=m.notes,
            meeting_type=m.meeting_type,
            created_at=m.created_at,
            case_id=m.case_id,
            case_title=c.title,
            case_number=c.case_number,
        )
        for m, c in rows
    ]


@standalone_router.patch("/{meeting_id}", response_model=schemas.MeetingOut)
def update_meeting(meeting_id: int, meeting_in: schemas.MeetingUpdate, db: Session = Depends(get_db)):
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="פגישה לא נמצאה")
    for field, value in meeting_in.model_dump(exclude_unset=True).items():
        setattr(meeting, field, value)
    db.commit()
    db.refresh(meeting)
    return meeting


@standalone_router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="פגישה לא נמצאה")
    db.delete(meeting)
    db.commit()

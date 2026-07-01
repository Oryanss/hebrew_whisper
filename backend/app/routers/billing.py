from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/api/cases/{case_id}",
    tags=["billing"],
    dependencies=[Depends(security.get_current_user)],
)

standalone_router = APIRouter(
    prefix="/api/time-entries", tags=["billing"], dependencies=[Depends(security.get_current_user)]
)


def _get_case_or_404(case_id: int, db: Session) -> models.Case:
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    return case


@router.get("/time-entries", response_model=List[schemas.TimeEntryOut])
def list_time_entries(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return (
        db.query(models.TimeEntry)
        .filter(models.TimeEntry.case_id == case_id)
        .order_by(models.TimeEntry.entry_date.desc())
        .all()
    )


@router.post("/time-entries", response_model=schemas.TimeEntryOut, status_code=201)
def create_time_entry(case_id: int, entry_in: schemas.TimeEntryCreate, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    entry = models.TimeEntry(**entry_in.model_dump(), case_id=case_id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/billing-summary", response_model=schemas.BillingSummary)
def get_billing_summary(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    entries = db.query(models.TimeEntry).filter(models.TimeEntry.case_id == case_id).all()

    total_hours = sum(e.hours for e in entries)
    billable_entries = [e for e in entries if e.billable]
    billable_hours = sum(e.hours for e in billable_entries)
    total_billable_amount = sum(
        e.hours * e.hourly_rate for e in billable_entries if e.hourly_rate is not None
    )
    entries_missing_rate = sum(1 for e in billable_entries if e.hourly_rate is None)

    return schemas.BillingSummary(
        total_hours=total_hours,
        billable_hours=billable_hours,
        total_billable_amount=total_billable_amount,
        entries_missing_rate=entries_missing_rate,
    )


@standalone_router.patch("/{entry_id}", response_model=schemas.TimeEntryOut)
def update_time_entry(entry_id: int, entry_in: schemas.TimeEntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(models.TimeEntry).filter(models.TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="רישום שעות לא נמצא")
    for field, value in entry_in.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@standalone_router.delete("/{entry_id}", status_code=204)
def delete_time_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.TimeEntry).filter(models.TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="רישום שעות לא נמצא")
    db.delete(entry)
    db.commit()

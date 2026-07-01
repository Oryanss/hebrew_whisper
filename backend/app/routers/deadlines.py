from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/api/cases/{case_id}/deadlines",
    tags=["deadlines"],
    dependencies=[Depends(security.get_current_user)],
)

standalone_router = APIRouter(
    prefix="/api/deadlines", tags=["deadlines"], dependencies=[Depends(security.get_current_user)]
)


def _get_case_or_404(case_id: int, db: Session) -> models.Case:
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    return case


@router.get("", response_model=List[schemas.DeadlineOut])
def list_case_deadlines(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return (
        db.query(models.Deadline)
        .filter(models.Deadline.case_id == case_id)
        .order_by(models.Deadline.due_date)
        .all()
    )


@router.post("", response_model=schemas.DeadlineOut, status_code=201)
def create_deadline(case_id: int, deadline_in: schemas.DeadlineCreate, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    deadline = models.Deadline(**deadline_in.model_dump(), case_id=case_id)
    db.add(deadline)
    db.commit()
    db.refresh(deadline)
    return deadline


@standalone_router.get("/upcoming", response_model=List[schemas.DeadlineWithCaseOut])
def list_upcoming_deadlines(days: int = 14, db: Session = Depends(get_db)):
    cutoff = datetime.utcnow() + timedelta(days=days)
    rows = (
        db.query(models.Deadline, models.Case)
        .join(models.Case, models.Deadline.case_id == models.Case.id)
        .filter(models.Deadline.status == models.DeadlineStatus.PENDING)
        .filter(models.Deadline.due_date <= cutoff)
        .order_by(models.Deadline.due_date)
        .all()
    )
    return [
        schemas.DeadlineWithCaseOut(
            id=d.id,
            title=d.title,
            due_date=d.due_date,
            description=d.description,
            status=d.status,
            created_at=d.created_at,
            case_id=d.case_id,
            case_title=c.title,
            case_number=c.case_number,
        )
        for d, c in rows
    ]


@standalone_router.patch("/{deadline_id}", response_model=schemas.DeadlineOut)
def update_deadline(deadline_id: int, deadline_in: schemas.DeadlineUpdate, db: Session = Depends(get_db)):
    deadline = db.query(models.Deadline).filter(models.Deadline.id == deadline_id).first()
    if not deadline:
        raise HTTPException(status_code=404, detail="מועד לא נמצא")
    for field, value in deadline_in.model_dump(exclude_unset=True).items():
        setattr(deadline, field, value)
    db.commit()
    db.refresh(deadline)
    return deadline


@standalone_router.delete("/{deadline_id}", status_code=204)
def delete_deadline(deadline_id: int, db: Session = Depends(get_db)):
    deadline = db.query(models.Deadline).filter(models.Deadline.id == deadline_id).first()
    if not deadline:
        raise HTTPException(status_code=404, detail="מועד לא נמצא")
    db.delete(deadline)
    db.commit()

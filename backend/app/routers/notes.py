from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/api/cases/{case_id}/notes", tags=["notes"], dependencies=[Depends(security.get_current_user)]
)

standalone_router = APIRouter(
    prefix="/api/notes", tags=["notes"], dependencies=[Depends(security.get_current_user)]
)


@router.get("", response_model=List[schemas.CaseNoteOut])
def list_case_notes(case_id: int, db: Session = Depends(get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    return (
        db.query(models.CaseNote)
        .filter(models.CaseNote.case_id == case_id)
        .order_by(models.CaseNote.created_at.desc())
        .all()
    )


@router.post("", response_model=schemas.CaseNoteOut, status_code=201)
def create_case_note(
    case_id: int,
    note_in: schemas.CaseNoteCreate,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    note = models.CaseNote(content=note_in.content, case_id=case_id, created_by=current_user.full_name)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@standalone_router.delete("/{note_id}", status_code=204)
def delete_case_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(models.CaseNote).filter(models.CaseNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="רשומה לא נמצאה")
    db.delete(note)
    db.commit()

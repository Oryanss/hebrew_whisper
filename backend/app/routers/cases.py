from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/api/cases", tags=["cases"], dependencies=[Depends(security.get_current_user)]
)


@router.get("", response_model=List[schemas.CaseOut])
def list_cases(db: Session = Depends(get_db)):
    return db.query(models.Case).order_by(models.Case.opened_date.desc()).all()


@router.post("", response_model=schemas.CaseOut, status_code=201)
def create_case(case_in: schemas.CaseCreate, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.id == case_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="לקוח לא נמצא")
    existing = db.query(models.Case).filter(models.Case.case_number == case_in.case_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="מספר תיק זה כבר קיים במערכת")

    case = models.Case(**case_in.model_dump())
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.get("/{case_id}", response_model=schemas.CaseOut)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    return case


@router.patch("/{case_id}", response_model=schemas.CaseOut)
def update_case(case_id: int, case_in: schemas.CaseUpdate, db: Session = Depends(get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    for field, value in case_in.model_dump(exclude_unset=True).items():
        setattr(case, field, value)
    db.commit()
    db.refresh(case)
    return case


@router.delete("/{case_id}", status_code=204)
def delete_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    db.delete(case)
    db.commit()


@router.get("/{case_id}/documents", response_model=List[schemas.DocumentOut])
def list_case_documents(case_id: int, db: Session = Depends(get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    return (
        db.query(models.Document)
        .filter(models.Document.case_id == case_id)
        .order_by(models.Document.created_at.desc())
        .all()
    )

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/api/templates", tags=["templates"], dependencies=[Depends(security.get_current_user)]
)


@router.get("", response_model=List[schemas.TemplateOut])
def list_templates(db: Session = Depends(get_db)):
    return db.query(models.Template).order_by(models.Template.name).all()


@router.post("", response_model=schemas.TemplateOut, status_code=201)
def create_template(template_in: schemas.TemplateCreate, db: Session = Depends(get_db)):
    template = models.Template(**template_in.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get("/{template_id}", response_model=schemas.TemplateOut)
def get_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="תבנית לא נמצאה")
    return template


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="תבנית לא נמצאה")
    db.delete(template)
    db.commit()

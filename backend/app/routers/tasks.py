from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/api/cases/{case_id}/tasks", tags=["tasks"], dependencies=[Depends(security.get_current_user)]
)

standalone_router = APIRouter(
    prefix="/api/tasks", tags=["tasks"], dependencies=[Depends(security.get_current_user)]
)


def _get_case_or_404(case_id: int, db: Session) -> models.Case:
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    return case


@router.get("", response_model=List[schemas.TaskOut])
def list_case_tasks(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return (
        db.query(models.Task)
        .filter(models.Task.case_id == case_id)
        .order_by(models.Task.done, models.Task.due_date, models.Task.created_at)
        .all()
    )


@router.post("", response_model=schemas.TaskOut, status_code=201)
def create_task(case_id: int, task_in: schemas.TaskCreate, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    task = models.Task(**task_in.model_dump(), case_id=case_id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@standalone_router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, task_in: schemas.TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="משימה לא נמצאה")
    for field, value in task_in.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@standalone_router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="משימה לא נמצאה")
    db.delete(task)
    db.commit()

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db
from ..risk_scoring import compute_risk_level, compute_risk_score, recommended_action

router = APIRouter(
    prefix="/api/cases/{case_id}/risk-assessments",
    tags=["risk"],
    dependencies=[Depends(security.get_current_user)],
)

standalone_router = APIRouter(
    prefix="/api/risk-assessments", tags=["risk"], dependencies=[Depends(security.get_current_user)]
)


def _to_out(assessment: models.RiskAssessment) -> schemas.RiskAssessmentOut:
    score = compute_risk_score(assessment.severity, assessment.likelihood)
    level = compute_risk_level(score)
    return schemas.RiskAssessmentOut(
        id=assessment.id,
        category=assessment.category,
        description=assessment.description,
        severity=assessment.severity,
        likelihood=assessment.likelihood,
        risk_score=score,
        risk_level=level,
        recommended_action=recommended_action(level),
        mitigating_factors=assessment.mitigating_factors,
        assessed_by=assessment.assessed_by,
        created_at=assessment.created_at,
        case_id=assessment.case_id,
    )


@router.get("", response_model=List[schemas.RiskAssessmentOut])
def list_risk_assessments(case_id: int, db: Session = Depends(get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    assessments = (
        db.query(models.RiskAssessment)
        .filter(models.RiskAssessment.case_id == case_id)
        .order_by(models.RiskAssessment.created_at.desc())
        .all()
    )
    return [_to_out(a) for a in assessments]


@router.post("", response_model=schemas.RiskAssessmentOut, status_code=201)
def create_risk_assessment(
    case_id: int,
    assessment_in: schemas.RiskAssessmentCreate,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    assessment = models.RiskAssessment(
        **assessment_in.model_dump(), case_id=case_id, assessed_by=current_user.full_name
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return _to_out(assessment)


@standalone_router.delete("/{assessment_id}", status_code=204)
def delete_risk_assessment(assessment_id: int, db: Session = Depends(get_db)):
    assessment = (
        db.query(models.RiskAssessment).filter(models.RiskAssessment.id == assessment_id).first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="הערכת סיכון לא נמצאה")
    db.delete(assessment)
    db.commit()

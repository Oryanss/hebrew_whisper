from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db
from ..citation_audit import find_citation_candidates

router = APIRouter(
    prefix="/api/authorities", tags=["authorities"], dependencies=[Depends(security.get_current_user)]
)


@router.get("", response_model=List[schemas.AuthorityOut])
def list_authorities(case_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Authority)
    if case_id is not None:
        query = query.filter(models.Authority.case_id == case_id)
    return query.order_by(models.Authority.verified_at.desc()).all()


@router.post("", response_model=schemas.AuthorityOut, status_code=201)
def create_authority(
    authority_in: schemas.AuthorityCreate,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db),
):
    data = authority_in.model_dump()
    if not data.get("verified_by"):
        data["verified_by"] = current_user.full_name
    authority = models.Authority(**data)
    db.add(authority)
    db.commit()
    db.refresh(authority)
    return authority


@router.delete("/{authority_id}", status_code=204)
def delete_authority(authority_id: int, db: Session = Depends(get_db)):
    authority = db.query(models.Authority).filter(models.Authority.id == authority_id).first()
    if not authority:
        raise HTTPException(status_code=404, detail="אסמכתא לא נמצאה")
    db.delete(authority)
    db.commit()


audit_router = APIRouter(
    prefix="/api/documents/{document_id}/audit-citations",
    tags=["authorities"],
    dependencies=[Depends(security.get_current_user)],
)


@audit_router.post("", response_model=schemas.CitationAuditResult)
def audit_document_citations(document_id: int, db: Session = Depends(get_db)):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="מסמך לא נמצא")

    candidates = find_citation_candidates(document.content)
    verified_authorities = (
        db.query(models.Authority)
        .filter(
            (models.Authority.case_id == document.case_id) | (models.Authority.case_id.is_(None))
        )
        .all()
    )

    findings = []
    unverified_count = 0
    for candidate in candidates:
        match = next(
            (a for a in verified_authorities if a.citation_text.strip() in candidate or candidate in a.citation_text.strip()),
            None,
        )
        verified = match is not None
        if not verified:
            unverified_count += 1
        findings.append(
            schemas.CitationFinding(
                citation_text=candidate,
                verified=verified,
                matched_authority_id=match.id if match else None,
            )
        )

    return schemas.CitationAuditResult(findings=findings, unverified_count=unverified_count)

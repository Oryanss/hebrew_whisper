from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db
from ..llm.client import generate_draft, LLMNotConfiguredError
from ..llm.prompts import build_user_prompt

router = APIRouter(
    prefix="/api/cases/{case_id}/draft", tags=["drafting"], dependencies=[Depends(security.get_current_user)]
)

DISCLAIMER = (
    "טיוטה שנוצרה בסיוע בינה מלאכותית - טעונה בדיקה, השלמה ואישור של עורך דין מוסמך לפני שימוש. "
    "אין להסתמך על תוכן זה כייעוץ משפטי סופי, ויש לוודא כל אסמכתא משפטית מול מקור מהימן."
)


@router.post("", response_model=schemas.DocumentOut, status_code=201)
def draft_document(case_id: int, draft_in: schemas.DraftRequest, db: Session = Depends(get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")

    template = None
    if draft_in.template_id is not None:
        template = db.query(models.Template).filter(models.Template.id == draft_in.template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="תבנית לא נמצאה")

    verified_authorities = (
        db.query(models.Authority)
        .filter((models.Authority.case_id == case_id) | (models.Authority.case_id.is_(None)))
        .all()
    )

    user_prompt = build_user_prompt(
        client_name=case.client.full_name,
        case_title=case.title,
        case_type=case.case_type,
        practice_area=case.practice_area,
        court=case.court,
        case_description=case.description,
        doc_type=draft_in.doc_type,
        doc_title=draft_in.title,
        template_instructions=template.prompt_instructions if template else None,
        structure_outline=template.structure_outline if template else None,
        user_instructions=draft_in.instructions,
        verified_authorities=[a.citation_text for a in verified_authorities],
    )

    try:
        content = generate_draft(user_prompt)
    except LLMNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    if DISCLAIMER not in content:
        content = f"{content}\n\n---\n{DISCLAIMER}"

    document = models.Document(
        title=draft_in.title,
        doc_type=draft_in.doc_type,
        content=content,
        case_id=case_id,
        template_id=draft_in.template_id,
        generation_notes=draft_in.instructions,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document

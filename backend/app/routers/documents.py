from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db
from ..docx_utils import build_docx_from_text, extract_text_from_docx

router = APIRouter(
    prefix="/api/documents", tags=["documents"], dependencies=[Depends(security.get_current_user)]
)

upload_router = APIRouter(
    prefix="/api/cases/{case_id}/documents",
    tags=["documents"],
    dependencies=[Depends(security.get_current_user)],
)


@router.get("/{document_id}", response_model=schemas.DocumentOut)
def get_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="מסמך לא נמצא")
    return document


@router.patch("/{document_id}", response_model=schemas.DocumentOut)
def update_document(
    document_id: int, document_in: schemas.DocumentUpdate, db: Session = Depends(get_db)
):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="מסמך לא נמצא")
    for field, value in document_in.model_dump(exclude_unset=True).items():
        setattr(document, field, value)
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=204)
def delete_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="מסמך לא נמצא")
    db.delete(document)
    db.commit()


@router.get("/{document_id}/export.docx")
def export_document_docx(document_id: int, db: Session = Depends(get_db)):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="מסמך לא נמצא")

    docx_bytes = build_docx_from_text(document.title, document.content)
    ascii_fallback = "".join(c for c in document.title if c.isascii() and (c.isalnum() or c in " -_"))
    ascii_fallback = ascii_fallback.strip() or "document"
    encoded_title = quote(f"{document.title}.docx")
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{ascii_fallback}.docx"; '
                f"filename*=UTF-8''{encoded_title}"
            )
        },
    )


@upload_router.post("/upload", response_model=schemas.DocumentOut, status_code=201)
async def upload_document(
    case_id: int,
    title: str = Form(...),
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")

    if not file.filename or not file.filename.lower().endswith(".docx"):
        raise HTTPException(
            status_code=400, detail="ניתן להעלות קבצי Word בפורמט .docx בלבד"
        )

    file_bytes = await file.read()
    try:
        content = extract_text_from_docx(file_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="לא ניתן היה לקרוא את קובץ ה-Word שהועלה")

    if not content:
        raise HTTPException(status_code=400, detail="הקובץ שהועלה ריק")

    document = models.Document(
        title=title,
        doc_type=doc_type,
        content=content,
        status=models.DocumentStatus.IN_REVIEW,
        case_id=case_id,
        generation_notes=f"הועלה מקובץ Word: {file.filename}",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document

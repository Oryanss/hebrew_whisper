from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db
from ..file_extract import UnsupportedFileTypeError, extract_text

router = APIRouter(
    prefix="/api/knowledge", tags=["knowledge"], dependencies=[Depends(security.get_current_user)]
)

SNIPPET_RADIUS = 120


@router.get("", response_model=List[schemas.KnowledgeDocumentOut])
def list_knowledge_documents(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.KnowledgeDocument)
    if category:
        query = query.filter(models.KnowledgeDocument.category == category)
    return query.order_by(models.KnowledgeDocument.created_at.desc()).all()


@router.get("/search", response_model=List[schemas.KnowledgeSearchResult])
def search_knowledge_documents(q: str, db: Session = Depends(get_db)):
    if not q.strip():
        return []
    docs = (
        db.query(models.KnowledgeDocument)
        .filter(
            or_(
                models.KnowledgeDocument.title.contains(q),
                models.KnowledgeDocument.content.contains(q),
            )
        )
        .order_by(models.KnowledgeDocument.created_at.desc())
        .limit(20)
        .all()
    )
    results = []
    for doc in docs:
        idx = doc.content.find(q)
        if idx == -1:
            snippet = doc.content[:SNIPPET_RADIUS * 2]
        else:
            start = max(0, idx - SNIPPET_RADIUS)
            end = min(len(doc.content), idx + len(q) + SNIPPET_RADIUS)
            snippet = ("…" if start > 0 else "") + doc.content[start:end] + (
                "…" if end < len(doc.content) else ""
            )
        results.append(
            schemas.KnowledgeSearchResult(
                id=doc.id, title=doc.title, category=doc.category, snippet=snippet
            )
        )
    return results


@router.get("/{document_id}", response_model=schemas.KnowledgeDocumentDetail)
def get_knowledge_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.KnowledgeDocument).filter(models.KnowledgeDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="מסמך לא נמצא בספריית הידע")
    return doc


@router.post("/upload", response_model=schemas.KnowledgeDocumentOut, status_code=201)
async def upload_knowledge_document(
    title: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db),
):
    file_bytes = await file.read()
    try:
        content = extract_text(file.filename or "", file_bytes)
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=400, detail="לא ניתן היה לקרוא את הקובץ שהועלה")

    if not content:
        raise HTTPException(status_code=400, detail="הקובץ שהועלה ריק")

    doc = models.KnowledgeDocument(
        title=title,
        category=category,
        content=content,
        source_filename=file.filename,
        uploaded_by=current_user.full_name,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{document_id}", status_code=204)
def delete_knowledge_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.KnowledgeDocument).filter(models.KnowledgeDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="מסמך לא נמצא בספריית הידע")
    db.delete(doc)
    db.commit()

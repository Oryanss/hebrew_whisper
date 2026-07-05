from typing import List
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db
from ..docx_utils import build_invoice_docx

router = APIRouter(
    prefix="/api/cases/{case_id}/invoices",
    tags=["invoices"],
    dependencies=[Depends(security.get_current_user)],
)

standalone_router = APIRouter(
    prefix="/api/invoices", tags=["invoices"], dependencies=[Depends(security.get_current_user)]
)


def _get_case_or_404(case_id: int, db: Session) -> models.Case:
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="תיק לא נמצא")
    return case


@router.get("", response_model=List[schemas.InvoiceOut])
def list_case_invoices(case_id: int, db: Session = Depends(get_db)):
    _get_case_or_404(case_id, db)
    return (
        db.query(models.Invoice)
        .filter(models.Invoice.case_id == case_id)
        .order_by(models.Invoice.issue_date.desc())
        .all()
    )


@router.post("", response_model=schemas.InvoiceOut, status_code=201)
def create_invoice(case_id: int, invoice_in: schemas.InvoiceCreate, db: Session = Depends(get_db)):
    case = _get_case_or_404(case_id, db)

    entries = (
        db.query(models.TimeEntry)
        .filter(
            models.TimeEntry.case_id == case_id,
            models.TimeEntry.billable.is_(True),
            models.TimeEntry.invoice_id.is_(None),
            models.TimeEntry.hourly_rate.isnot(None),
        )
        .all()
    )
    if not entries:
        raise HTTPException(
            status_code=400,
            detail="אין רישומי שעות לחיוב (עם תעריף שעתי) שטרם נכללו בחשבונית עבור תיק זה",
        )

    total_amount = sum(entry.hours * entry.hourly_rate for entry in entries)
    sequence = db.query(models.Invoice).filter(models.Invoice.case_id == case_id).count() + 1

    invoice = models.Invoice(
        invoice_number=f"{case.case_number}-INV-{sequence}",
        total_amount=total_amount,
        notes=invoice_in.notes,
        case_id=case_id,
    )
    db.add(invoice)
    db.flush()
    for entry in entries:
        entry.invoice_id = invoice.id
    db.commit()
    db.refresh(invoice)
    return invoice


@standalone_router.get("/{invoice_id}", response_model=schemas.InvoiceDetailOut)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="חשבונית לא נמצאה")
    return invoice


@standalone_router.get("/{invoice_id}/export.docx")
def export_invoice_docx(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="חשבונית לא נמצאה")
    case = invoice.case
    docx_bytes = build_invoice_docx(invoice, case, case.client)

    filename = f"חשבונית {invoice.invoice_number}.docx"
    ascii_fallback = "".join(
        c for c in invoice.invoice_number if c.isascii() and (c.isalnum() or c in " -_")
    )
    ascii_fallback = ascii_fallback.strip() or "invoice"
    encoded_filename = quote(filename)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": (
                f'attachment; filename="invoice-{ascii_fallback}.docx"; '
                f"filename*=UTF-8''{encoded_filename}"
            )
        },
    )


@standalone_router.patch("/{invoice_id}", response_model=schemas.InvoiceOut)
def update_invoice(invoice_id: int, invoice_in: schemas.InvoiceUpdate, db: Session = Depends(get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="חשבונית לא נמצאה")
    for field, value in invoice_in.model_dump(exclude_unset=True).items():
        setattr(invoice, field, value)
    db.commit()
    db.refresh(invoice)
    return invoice


@standalone_router.delete("/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="חשבונית לא נמצאה")
    db.query(models.TimeEntry).filter(models.TimeEntry.invoice_id == invoice_id).update(
        {"invoice_id": None}
    )
    db.delete(invoice)
    db.commit()

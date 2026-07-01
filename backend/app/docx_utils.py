import io
from datetime import datetime
from typing import Sequence

from docx import Document as DocxDocument
from docx.enum.text import WD_ALIGN_PARAGRAPH


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract plain text from an uploaded .docx file, preserving paragraph
    breaks. Tables are read row by row as tab-separated text."""
    docx = DocxDocument(io.BytesIO(file_bytes))
    parts = []
    for para in docx.paragraphs:
        parts.append(para.text)
    for table in docx.tables:
        for row in table.rows:
            parts.append("\t".join(cell.text for cell in row.cells))
    return "\n".join(parts).strip()


def build_docx_from_text(title: str, content: str) -> bytes:
    """Build a .docx file from plain text content, one paragraph per line."""
    docx = DocxDocument()
    docx.add_heading(title, level=1)
    for line in content.split("\n"):
        docx.add_paragraph(line)
    buffer = io.BytesIO()
    docx.save(buffer)
    return buffer.getvalue()


def build_invoice_docx(
    case,
    client,
    time_entries: Sequence,
    missing_rate_count: int,
) -> bytes:
    """Build a client-ready Word invoice from a case's billable, priced time
    entries. Entries that are not billable, or billable but missing an
    hourly rate, are excluded from the itemized table and the total - the
    document explicitly states how many billable entries were excluded for
    missing a rate, so it is never silently wrong about what it billed."""
    docx = DocxDocument()

    docx.add_heading("חשבונית שירותים משפטיים", level=1)

    meta = docx.add_paragraph()
    meta.add_run(f"לקוח: {client.full_name}\n")
    meta.add_run(f"תיק: {case.title} ({case.case_number})\n")
    meta.add_run(f"תאריך הפקה: {datetime.utcnow().strftime('%d/%m/%Y')}")

    priced_entries = [
        e for e in time_entries if e.billable and e.hourly_rate is not None
    ]

    table = docx.add_table(rows=1, cols=5)
    table.style = "Light Grid Accent 1"
    header_cells = table.rows[0].cells
    headers = ["תאריך", "תיאור", "שעות", "תעריף שעתי (₪)", 'סה"כ (₪)']
    for cell, text in zip(header_cells, headers):
        cell.text = text
        for p in cell.paragraphs:
            for run in p.runs:
                run.bold = True

    total = 0.0
    for entry in priced_entries:
        line_total = entry.hours * entry.hourly_rate
        total += line_total
        row_cells = table.add_row().cells
        row_cells[0].text = entry.entry_date.strftime("%d/%m/%Y")
        row_cells[1].text = entry.description
        row_cells[2].text = f"{entry.hours:g}"
        row_cells[3].text = f"{entry.hourly_rate:,.2f}"
        row_cells[4].text = f"{line_total:,.2f}"

    if not priced_entries:
        empty_note = docx.add_paragraph()
        empty_note.add_run(
            "אין רישומי שעות לחיוב בעלי תעריף שעתי עבור תיק זה נכון למועד הפקת החשבונית."
        ).italic = True

    total_para = docx.add_paragraph()
    total_run = total_para.add_run(f'סה"כ לתשלום: {total:,.2f} ₪')
    total_run.bold = True
    total_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT

    if missing_rate_count > 0:
        note = docx.add_paragraph()
        note.add_run(
            f"לתשומת לב: {missing_rate_count} רישומי שעות לחיוב אינם כלולים בחשבונית זו "
            "מאחר וחסר להם תעריף שעתי."
        ).italic = True

    buffer = io.BytesIO()
    docx.save(buffer)
    return buffer.getvalue()

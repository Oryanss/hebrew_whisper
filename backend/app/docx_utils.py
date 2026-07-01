import io

from docx import Document as DocxDocument


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

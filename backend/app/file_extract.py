import io

from pypdf import PdfReader

from .docx_utils import extract_text_from_docx

SUPPORTED_EXTENSIONS = (".docx", ".pdf", ".txt")


class UnsupportedFileTypeError(ValueError):
    pass


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages).strip()


def extract_text(filename: str, file_bytes: bytes) -> str:
    """Extract plain text from an uploaded reference file based on its
    extension. Supports .docx, .pdf, and .txt."""
    lowered = filename.lower()
    if lowered.endswith(".docx"):
        return extract_text_from_docx(file_bytes)
    if lowered.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    if lowered.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="replace").strip()
    raise UnsupportedFileTypeError(
        f"סוג קובץ לא נתמך: יש להעלות קובץ מסוג {', '.join(SUPPORTED_EXTENSIONS)} בלבד"
    )

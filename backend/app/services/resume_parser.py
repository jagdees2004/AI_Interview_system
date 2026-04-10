from __future__ import annotations

from PyPDF2 import PdfReader
from app.core.logging import logger


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF file's bytes."""
    import io

    reader = PdfReader(io.BytesIO(file_bytes))
    pages_text = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages_text.append(text)
    full_text = "\n".join(pages_text)
    logger.info(f"Extracted {len(full_text)} characters from PDF ({len(reader.pages)} pages)")
    return full_text

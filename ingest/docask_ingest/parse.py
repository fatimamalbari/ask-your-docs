import re
from dataclasses import dataclass

MIN_CHARS_PER_PAGE = 50


class IngestError(Exception):
    """A problem with the document itself. The message is safe to show to the user."""


class UnsupportedType(IngestError):
    pass


class NoTextLayer(IngestError):
    pass


@dataclass
class Page:
    number: int | None  # 1-based for PDFs, None for plain text
    paragraphs: list[str]


def clean(text: str) -> str:
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)  # re-\ncover -> recover
    return re.sub(r"\s+", " ", text).strip()


def parse(name: str, data: bytes) -> list[Page]:
    lower = name.lower()
    if lower.endswith(".pdf"):
        return _parse_pdf(data)
    if lower.endswith((".md", ".txt")):
        return _parse_text(data)
    raise UnsupportedType("Only .pdf, .md and .txt files are supported.")


def _parse_text(data: bytes) -> list[Page]:
    text = data.decode("utf-8", errors="replace")
    paragraphs = [p for p in (clean(p) for p in re.split(r"\n\s*\n", text)) if p]
    return [Page(None, paragraphs)] if paragraphs else []


def _parse_pdf(data: bytes) -> list[Page]:
    import pymupdf

    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception as err:
        raise IngestError("This file could not be read as a PDF.") from err
    if doc.needs_pass:
        raise IngestError("This PDF is password protected.")

    pages: list[Page] = []
    chars = 0
    for number, page in enumerate(doc, start=1):
        # Each text block (block_type 0) is roughly one paragraph, in reading order.
        blocks = page.get_text("blocks", sort=True)
        paragraphs = [p for p in (clean(b[4]) for b in blocks if b[6] == 0) if p]
        chars += sum(len(p) for p in paragraphs)
        pages.append(Page(number, paragraphs))

    if not pages or chars / len(pages) < MIN_CHARS_PER_PAGE:
        raise NoTextLayer("No text found in this PDF. It may be a scan, which needs OCR.")
    return pages

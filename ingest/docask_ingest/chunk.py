import re
from dataclasses import dataclass

from .parse import Page


@dataclass
class Chunk:
    page: int | None
    text: str


def _split_long(text: str, max_chars: int) -> list[str]:
    """Break an oversized paragraph at sentence ends, or at spaces if a sentence is too long."""
    if len(text) <= max_chars:
        return [text]
    out: list[str] = []
    cur = ""
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        while len(sentence) > max_chars:
            cut = sentence.rfind(" ", 0, max_chars)
            cut = cut if cut > 0 else max_chars
            head, sentence = sentence[:cut], sentence[cut:].lstrip()
            if cur:
                out.append(cur)
                cur = ""
            out.append(head)
        if cur and len(cur) + 1 + len(sentence) > max_chars:
            out.append(cur)
            cur = sentence
        else:
            cur = f"{cur} {sentence}".strip()
    if cur:
        out.append(cur)
    return out


def _tail(text: str, overlap: int) -> str:
    """Last `overlap` characters of text, starting on a word boundary."""
    if overlap <= 0:
        return ""
    if len(text) <= overlap:
        return text
    tail = text[-overlap:]
    space = tail.find(" ")
    return tail[space + 1 :] if space >= 0 else tail


def chunk_paragraphs(paragraphs: list[str], max_chars: int, overlap: int) -> list[str]:
    """Pack paragraphs into chunks of about max_chars, repeating `overlap` characters between chunks.

    A chunk can exceed max_chars by up to `overlap` because the carried-over tail is added in front.
    """
    pieces = [piece for p in paragraphs for piece in _split_long(p, max_chars)]
    chunks: list[str] = []
    cur = ""
    for piece in pieces:
        if cur and len(cur) + 1 + len(piece) > max_chars:
            chunks.append(cur)
            cur = f"{_tail(cur, overlap)} {piece}".strip()
        else:
            cur = f"{cur} {piece}".strip()
    if cur:
        chunks.append(cur)
    return chunks


def chunk_pages(pages: list[Page], max_chars: int, overlap: int) -> list[Chunk]:
    """Chunk each page separately so a chunk never spans two pages."""
    return [
        Chunk(page.number, text)
        for page in pages
        for text in chunk_paragraphs(page.paragraphs, max_chars, overlap)
    ]

import json
from pathlib import Path

import pymupdf
import pytest

from docask_ingest.config import Settings
from docask_ingest.core import ingest_file
from docask_ingest.embed import MockEmbedder
from docask_ingest.parse import clean
from docask_ingest.store import LocalStore, safe_doc_id

SETTINGS = Settings(data_dir="", mock=True, project=None, location="x", embed_model="mock", max_chars=500, overlap=50)


def make_pdf(*page_texts: str) -> bytes:
    doc = pymupdf.open()
    for text in page_texts:
        page = doc.new_page()
        page.insert_textbox(pymupdf.Rect(50, 50, 550, 750), text, fontsize=11)
    return doc.tobytes()


def run(tmp_path: Path, name: str, data: bytes) -> tuple[dict, str]:
    store = LocalStore(str(tmp_path))
    job = ingest_file(name, data, store=store, embedder=MockEmbedder(), settings=SETTINGS)
    return job, safe_doc_id(name)


def read(tmp_path: Path, kind: str, doc_id: str) -> dict:
    return json.loads((tmp_path / kind / f"{doc_id}.json").read_text())


def test_pdf_pages_are_kept_on_chunks(tmp_path):
    page1 = "Refunds are issued within fourteen days of purchase. " * 3
    page2 = "Laptops are shipped by IT before the start date. " * 3
    job, doc_id = run(tmp_path, "policy.pdf", make_pdf(page1, page2))

    assert job["state"] == "done"
    shard = read(tmp_path, "index", doc_id)
    assert shard["schema_version"] == 1 and shard["embedding_model"] == "mock" and shard["dims"] == 256
    assert {c["page"] for c in shard["chunks"]} == {1, 2}
    page2_text = " ".join(c["text"] for c in shard["chunks"] if c["page"] == 2)
    assert "Laptops" in page2_text and "Refunds" not in page2_text
    assert read(tmp_path, "jobs", doc_id)["state"] == "done"


def test_markdown_chunks_have_null_page(tmp_path):
    job, doc_id = run(tmp_path, "notes.md", b"# Title\n\nSome notes about refunds.\n")
    assert job["state"] == "done"
    assert {c["page"] for c in read(tmp_path, "index", doc_id)["chunks"]} == {None}


def test_pdf_without_text_layer_fails_cleanly(tmp_path):
    doc = pymupdf.open()
    doc.new_page()
    job, doc_id = run(tmp_path, "scan.pdf", doc.tobytes())
    assert job["state"] == "failed"
    assert "OCR" in job["error"]
    assert not (tmp_path / "index" / f"{doc_id}.json").exists()


def test_unsupported_type_fails_cleanly(tmp_path):
    job, _ = run(tmp_path, "image.png", b"\x89PNG")
    assert job["state"] == "failed" and ".pdf" in job["error"]


def test_garbage_pdf_fails_cleanly(tmp_path):
    job, _ = run(tmp_path, "broken.pdf", b"not a pdf at all")
    assert job["state"] == "failed"


def test_hyphenated_line_breaks_are_joined():
    assert clean("we can re-\ncover the text") == "we can recover the text"


@pytest.mark.parametrize(
    "name, expected",
    [("a b.pdf", "a_b.pdf"), ("../../etc/passwd", "passwd"), ("..\\x.md", "x.md"), (".hidden", "hidden")],
)
def test_safe_doc_id(name, expected):
    assert safe_doc_id(name) == expected

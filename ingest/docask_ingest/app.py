from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .core import ingest_file
from .runtime import get_runtime
from .store import safe_doc_id

app = FastAPI(title="DocAsk ingest worker")


class IngestRequest(BaseModel):
    doc: str  # name of a file already stored under docs/


@app.get("/healthz")
def healthz() -> str:
    return "ok"


@app.post("/ingest")
def ingest(req: IngestRequest) -> dict:
    """Index a stored document. Runs to completion before responding."""
    rt = get_runtime()
    try:
        doc_id = safe_doc_id(req.doc)
        data = rt.store.get_doc(doc_id)
    except (ValueError, FileNotFoundError):
        raise HTTPException(status_code=404, detail="document not found")
    return ingest_file(doc_id, data, store=rt.store, embedder=rt.embedder, settings=rt.settings)

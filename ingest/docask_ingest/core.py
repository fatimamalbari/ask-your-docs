import logging
from datetime import datetime, timezone

from .chunk import chunk_pages
from .config import SCHEMA_VERSION, Settings
from .embed import Embedder
from .parse import IngestError, parse
from .store import Store, safe_doc_id

log = logging.getLogger("docask_ingest")

BATCH = 20  # texts per embedding request


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ingest_file(name: str, data: bytes, *, store: Store, embedder: Embedder, settings: Settings) -> dict:
    """Parse, chunk and embed one document, write its shard, and return the final job status.

    Problems with the document itself end in a `failed` job, not an exception, so a trigger that
    retries on errors does not retry them forever.
    """
    doc_id = safe_doc_id(name)

    def set_job(state: str, progress: int = 0, total: int = 0, error: str | None = None) -> dict:
        job = {"state": state, "progress": progress, "total": total, "error": error, "updated_at": _now()}
        store.put_job(doc_id, job)
        return job

    try:
        set_job("parsing")
        chunks = chunk_pages(parse(name, data), settings.max_chars, settings.overlap)
        if not chunks:
            raise IngestError("No text found in this file.")

        total = len(chunks)
        vectors: list[list[float]] = []
        for i in range(0, total, BATCH):
            set_job("embedding", i, total)
            vectors.extend(embedder.embed([c.text for c in chunks[i : i + BATCH]], "RETRIEVAL_DOCUMENT"))

        store.put_shard(
            doc_id,
            {
                "schema_version": SCHEMA_VERSION,
                "source": name,
                "embedding_model": embedder.model,
                "dims": len(vectors[0]),
                "created_at": _now(),
                "chunks": [{"page": c.page, "text": c.text, "vector": v} for c, v in zip(chunks, vectors)],
            },
        )
        return set_job("done", total, total)
    except IngestError as err:
        return set_job("failed", error=str(err))
    except Exception:
        log.exception("ingest failed for %s", doc_id)
        return set_job("failed", error="Something went wrong while indexing this file.")

import json
import os
import re
import tempfile
from typing import Protocol


def safe_doc_id(name: str) -> str:
    """Must match the docId rule in contract/CONTRACT.md."""
    doc_id = re.sub(r"[^A-Za-z0-9._-]", "_", os.path.basename(name.replace("\\", "/"))).lstrip(".")
    if not doc_id:
        raise ValueError("empty file name")
    return doc_id


class Store(Protocol):
    def put_doc(self, doc_id: str, data: bytes) -> None: ...
    def get_doc(self, doc_id: str) -> bytes: ...
    def put_shard(self, doc_id: str, shard: dict) -> None: ...
    def put_job(self, doc_id: str, job: dict) -> None: ...


class LocalStore:
    def __init__(self, root: str):
        self._root = os.path.abspath(root)

    def _path(self, kind: str, filename: str) -> str:
        path = os.path.join(self._root, kind, filename)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        return path

    def _write(self, path: str, data: bytes) -> None:
        # Write to a temp file first so a reader never sees half a file.
        fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path))
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        os.replace(tmp, path)

    def put_doc(self, doc_id: str, data: bytes) -> None:
        self._write(self._path("docs", doc_id), data)

    def get_doc(self, doc_id: str) -> bytes:
        with open(self._path("docs", doc_id), "rb") as f:
            return f.read()

    def put_shard(self, doc_id: str, shard: dict) -> None:
        self._write(self._path("index", f"{doc_id}.json"), json.dumps(shard).encode())

    def put_job(self, doc_id: str, job: dict) -> None:
        self._write(self._path("jobs", f"{doc_id}.json"), json.dumps(job).encode())

"""Ingest files from the command line: python -m docask_ingest FILE [FILE ...]"""
import argparse
import os
import sys

from .core import ingest_file
from .runtime import get_runtime
from .store import safe_doc_id


def main() -> int:
    parser = argparse.ArgumentParser(prog="docask_ingest")
    parser.add_argument("files", nargs="+", help=".pdf, .md or .txt files to index")
    args = parser.parse_args()

    rt = get_runtime()
    failed = 0
    for path in args.files:
        name = os.path.basename(path)
        with open(path, "rb") as f:
            data = f.read()
        rt.store.put_doc(safe_doc_id(name), data)
        job = ingest_file(name, data, store=rt.store, embedder=rt.embedder, settings=rt.settings)
        if job["state"] == "done":
            print(f"{name}: {job['total']} chunks")
        else:
            failed += 1
            print(f"{name}: FAILED - {job['error']}", file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

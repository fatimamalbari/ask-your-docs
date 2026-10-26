# Contract between the Node API and the Python ingest worker

Both sides read and write the same storage layout. If you change anything here, change both sides and bump `schema_version`.

## Storage layout

Local dev uses `DATA_DIR` (default `data/`). In the cloud the same paths live in the GCS bucket `STORAGE_BUCKET`.

```
docs/<docId>      original uploaded file
index/<docId>.json  index shard (written by the worker, read by the API)
jobs/<docId>.json   job status (written by the worker, read by the API)
```

`docId` is the uploaded file name reduced to `[A-Za-z0-9._-]` (everything else becomes `_`), with no leading dots. The API and the worker must derive it the same way.

## Embeddings

Documents and questions must be embedded with the same model and dimensions, or search silently returns wrong results.

| Side | Task type |
|---|---|
| Worker (documents) | `RETRIEVAL_DOCUMENT` |
| API (questions) | `RETRIEVAL_QUERY` |

Default model: `text-embedding-005`, set by `EMBED_MODEL` on both sides. Each shard records the model and dimensions it was built with. The API refuses to search shards whose `embedding_model` or `dims` differ from its own configuration.

Mock mode (`MOCK_AI=1`) uses a word-hash vector of 256 dimensions. Both implementations must produce identical output, checked against `contract/mock-vectors.json` by a test on each side.

## Index shard

```json
{
  "schema_version": 1,
  "source": "paper.pdf",
  "embedding_model": "text-embedding-005",
  "dims": 768,
  "created_at": "2026-10-26T12:00:00Z",
  "chunks": [
    { "page": 12, "text": "...", "vector": [0.01, -0.02, "..."] }
  ]
}
```

`page` is a 1-based integer for PDFs and `null` for `.md` and `.txt`. A chunk never spans two pages.

## Job status

```json
{
  "state": "embedding",
  "progress": 80,
  "total": 200,
  "error": null,
  "updated_at": "2026-10-26T12:00:05Z"
}
```

`state` is one of `queued`, `parsing`, `embedding`, `done`, `failed`. `queued` is written by the API when it accepts an upload. The worker writes the rest. `progress` and `total` count chunks. `error` is a message safe to show to the user.

A shard is written before the job is marked `done`, so the API can load it as soon as it sees `done`. Re-ingesting the same file overwrites its shard and is safe to repeat.

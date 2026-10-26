import os
from dataclasses import dataclass

SCHEMA_VERSION = 1


@dataclass(frozen=True)
class Settings:
    data_dir: str
    mock: bool
    project: str | None
    location: str
    embed_model: str
    max_chars: int
    overlap: int


def load_settings() -> Settings:
    return Settings(
        data_dir=os.environ.get("DATA_DIR", "data"),
        mock=os.environ.get("MOCK_AI") == "1",
        project=os.environ.get("GOOGLE_CLOUD_PROJECT"),
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
        embed_model=os.environ.get("EMBED_MODEL", "text-embedding-005"),
        max_chars=int(os.environ.get("CHUNK_MAX_CHARS", "1000")),
        overlap=int(os.environ.get("CHUNK_OVERLAP", "150")),
    )

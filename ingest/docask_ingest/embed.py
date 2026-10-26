import random
import re
import time
from typing import Callable, Protocol

from .config import Settings

MOCK_DIMS = 256
RETRYABLE_CODES = {429, 500, 502, 503, 504}
_WORD = re.compile(r"[a-z0-9]+")


class Embedder(Protocol):
    model: str

    def embed(self, texts: list[str], task_type: str) -> list[list[float]]: ...


def mock_vector(text: str) -> list[int]:
    """Word-hash vector. Must match mockVector() in src/rag.js exactly."""
    v = [0] * MOCK_DIMS
    for word in _WORD.findall(text.lower()):
        h = 0
        for c in word:
            h = (h * 31 + ord(c)) % MOCK_DIMS
        v[h] += 1
    return v


class MockEmbedder:
    model = "mock"

    def embed(self, texts: list[str], task_type: str) -> list[list[float]]:
        return [mock_vector(t) for t in texts]


class VertexEmbedder:
    """Embeds with Vertex AI using Application Default Credentials."""

    def __init__(
        self,
        settings: Settings,
        attempts: int = 5,
        sleep: Callable[[float], None] = time.sleep,
    ):
        from google import genai

        self.model = settings.embed_model
        self._client = genai.Client(vertexai=True, project=settings.project, location=settings.location)
        self._attempts = attempts
        self._sleep = sleep

    def embed(self, texts: list[str], task_type: str) -> list[list[float]]:
        from google.genai import errors, types

        config = types.EmbedContentConfig(task_type=task_type)
        for attempt in range(self._attempts):
            try:
                res = self._client.models.embed_content(model=self.model, contents=texts, config=config)
                return [e.values for e in res.embeddings]
            except errors.APIError as err:
                if err.code not in RETRYABLE_CODES or attempt == self._attempts - 1:
                    raise
                self._sleep(2**attempt + random.random())
        raise AssertionError("unreachable")


def build_embedder(settings: Settings) -> Embedder:
    return MockEmbedder() if settings.mock else VertexEmbedder(settings)

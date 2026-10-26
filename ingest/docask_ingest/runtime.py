from dataclasses import dataclass
from functools import lru_cache

from .config import Settings, load_settings
from .embed import Embedder, build_embedder
from .store import LocalStore, Store


@dataclass
class Runtime:
    settings: Settings
    store: Store
    embedder: Embedder


@lru_cache(maxsize=1)
def get_runtime() -> Runtime:
    settings = load_settings()
    return Runtime(settings, LocalStore(settings.data_dir), build_embedder(settings))

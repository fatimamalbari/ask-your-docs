import json
from pathlib import Path

from docask_ingest.embed import mock_vector

FIXTURE = Path(__file__).resolve().parents[2] / "contract" / "mock-vectors.json"


def test_mock_vectors_match_the_node_implementation():
    cases = json.loads(FIXTURE.read_text())
    assert cases, "fixture is empty"
    for case in cases:
        assert mock_vector(case["text"]) == case["vector"], case["text"]

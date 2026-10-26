from docask_ingest.chunk import chunk_pages, chunk_paragraphs
from docask_ingest.parse import Page


def test_small_paragraphs_pack_into_one_chunk():
    assert chunk_paragraphs(["one two", "three four"], 100, 10) == ["one two three four"]


def test_long_paragraph_is_split_within_limits():
    text = " ".join(f"word{i}" for i in range(400))
    chunks = chunk_paragraphs([text], 200, 30)
    assert len(chunks) > 1
    assert all(len(c) <= 200 + 30 + 1 for c in chunks)
    assert " ".join(chunks).count("word399") >= 1


def test_overlap_repeats_text_between_chunks():
    paragraphs = [f"{'a' * 20}{i} " + "x" * 60 for i in range(6)]
    chunks = chunk_paragraphs(paragraphs, 100, 25)
    assert len(chunks) > 1
    # the start of each later chunk repeats the end of the one before it
    assert chunks[1].split(" ")[0] in chunks[0]


def test_sentence_longer_than_limit_is_hard_split():
    chunks = chunk_paragraphs(["y" * 450], 200, 0)
    assert [len(c) for c in chunks] == [200, 200, 50]


def test_chunks_never_span_pages():
    pages = [Page(1, ["alpha beta"]), Page(2, ["gamma delta"])]
    chunks = chunk_pages(pages, 1000, 100)
    assert [(c.page, c.text) for c in chunks] == [(1, "alpha beta"), (2, "gamma delta")]


def test_plain_text_pages_have_no_page_number():
    chunks = chunk_pages([Page(None, ["hello"])], 1000, 100)
    assert chunks[0].page is None

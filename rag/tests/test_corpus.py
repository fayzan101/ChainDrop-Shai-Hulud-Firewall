from __future__ import annotations

from pathlib import Path

from rag.corpus import corpus_health, filter_for_corpus_version, load_documents

ROOT = Path(__file__).resolve().parents[2]
FIXTURE_CORPUS = ROOT / "fixtures/rag-corpus/documents.jsonl"


def test_no_chaindrop_pin_excludes_chaindrop_documents() -> None:
    docs = load_documents(FIXTURE_CORPUS)
    active = filter_for_corpus_version(docs, "no-chaindrop")
    ids = {doc.doc_id for doc in active}
    assert "ti-chaindrop-heldout" not in ids
    health = corpus_health(docs, "no-chaindrop")
    assert health["chaindrop_documents"] == 0
    assert health["document_count"] == 4

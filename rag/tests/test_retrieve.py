from __future__ import annotations

from pathlib import Path

from rag.corpus import filter_for_corpus_version, load_documents
from rag.retrieve import retrieve_top_k

ROOT = Path(__file__).resolve().parents[2]
FIXTURE_CORPUS = ROOT / "fixtures/rag-corpus/documents.jsonl"


def test_retrieve_prefers_credential_harvest_intel() -> None:
    docs = filter_for_corpus_version(load_documents(FIXTURE_CORPUS), "no-chaindrop")
    hits = retrieve_top_k("npmrc child_process credential harvest token", docs, k=3)
    assert hits
    assert any("ti-shulud" in chunk["doc_id"] for chunk in hits)

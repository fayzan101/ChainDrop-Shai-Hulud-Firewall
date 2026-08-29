"""Corpus load and no-chaindrop filtering."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

HELDOUT_CORPUS_PIN = "no-chaindrop"
CHAIN_DROP_TAG = "chaindrop"


@dataclass(frozen=True)
class CorpusDocument:
    doc_id: str
    title: str
    text: str
    url: str | None
    published_at: str | None
    campaign_tags: list[str]
    exclude_from_heldout_corpus: bool

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> CorpusDocument:
        return cls(
            doc_id=str(row["doc_id"]),
            title=str(row["title"]),
            text=str(row.get("text") or ""),
            url=row.get("url"),
            published_at=row.get("published_at"),
            campaign_tags=list(row.get("campaign_tags") or []),
            exclude_from_heldout_corpus=bool(row.get("exclude_from_heldout_corpus")),
        )


def load_documents(path: str | Path) -> list[CorpusDocument]:
    docs: list[CorpusDocument] = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        docs.append(CorpusDocument.from_row(json.loads(line)))
    return docs


def filter_for_corpus_version(
    documents: list[CorpusDocument], corpus_version: str
) -> list[CorpusDocument]:
    if corpus_version != HELDOUT_CORPUS_PIN:
        return list(documents)
    return [
        doc
        for doc in documents
        if not doc.exclude_from_heldout_corpus
        and CHAIN_DROP_TAG not in [t.lower() for t in doc.campaign_tags]
    ]


def corpus_health(documents: list[CorpusDocument], corpus_version: str) -> dict[str, Any]:
    active = filter_for_corpus_version(documents, corpus_version)
    chaindrop_docs = [
        doc
        for doc in active
        if CHAIN_DROP_TAG in [t.lower() for t in doc.campaign_tags]
    ]
    return {
        "corpus_version": corpus_version,
        "document_count": len(active),
        "chaindrop_documents": len(chaindrop_docs),
        "embedded_at": None,
    }

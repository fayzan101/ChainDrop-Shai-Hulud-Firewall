"""Pre-flight guards for held-out evaluation."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from classifier.schema import HELD_OUT_CAMPAIGN
from classifier.train import assert_no_heldout_leak
from rag.corpus import corpus_health, load_documents


def assert_no_chaindrop_corpus(documents_path: Path, corpus_version: str) -> dict[str, Any]:
    docs = load_documents(documents_path)
    health = corpus_health(docs, corpus_version)
    if health["chaindrop_documents"] != 0:
        raise RuntimeError(
            f"eval corpus pin {corpus_version!r} must have chaindrop_documents=0 "
            f"(got {health['chaindrop_documents']})"
        )
    return health


def assert_heldout_rows(rows: list[dict[str, Any]]) -> None:
    heldout = [r for r in rows if r.get("split") == "heldout"]
    if not heldout:
        raise ValueError("no held-out rows in evaluation set")
    chaindrop = [
        r
        for r in heldout
        if (r.get("campaign") or "").lower() == HELD_OUT_CAMPAIGN
    ]
    if not chaindrop:
        raise ValueError("held-out set must include ChainDrop rows")
    trainable = [r for r in rows if r.get("split") in {"train", "val"}]
    assert_no_heldout_leak(trainable)

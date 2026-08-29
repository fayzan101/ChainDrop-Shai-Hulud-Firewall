"""Lightweight keyword retrieval (no vector DB required for Phase 6 fixtures)."""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any

from rag.corpus import CorpusDocument

_TOKEN = re.compile(r"[a-z0-9][a-z0-9._-]{1,}")


def _tokens(text: str) -> list[str]:
    return _TOKEN.findall(text.lower())


def retrieve_top_k(
    query: str,
    documents: list[CorpusDocument],
    k: int = 8,
) -> list[dict[str, Any]]:
    query_counts = Counter(_tokens(query))
    if not query_counts:
        return []

    scored: list[tuple[float, CorpusDocument]] = []
    for doc in documents:
        doc_counts = Counter(_tokens(doc.text))
        if not doc_counts:
            continue
        dot = sum(query_counts[t] * doc_counts.get(t, 0) for t in query_counts)
        if dot <= 0:
            continue
        norm_q = math.sqrt(sum(v * v for v in query_counts.values()))
        norm_d = math.sqrt(sum(v * v for v in doc_counts.values()))
        score = dot / (norm_q * norm_d)
        scored.append((score, doc))

    scored.sort(key=lambda item: item[0], reverse=True)
    results: list[dict[str, Any]] = []
    for score, doc in scored[:k]:
        results.append(
            {
                "doc_id": doc.doc_id,
                "title": doc.title,
                "url": doc.url,
                "date": doc.published_at,
                "score": round(score, 4),
                "text": doc.text,
                "campaign_tags": doc.campaign_tags,
            }
        )
    return results

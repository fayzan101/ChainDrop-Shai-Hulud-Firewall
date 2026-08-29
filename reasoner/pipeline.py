"""Full config (c) pipeline: summary → retrieve → reasoner."""

from __future__ import annotations

from typing import Any

from rag.corpus import filter_for_corpus_version, load_documents
from rag.redact import redact_text
from rag.retrieve import retrieve_top_k
from reasoner.degraded import degraded_verdict
from reasoner.providers import FixtureReasonerProvider, ReasonerProvider
from reasoner.schema import ReasonerSchemaError
from reasoner.summary import build_behavior_summary

PROMPT_VERSION = "verdict-fixture-0.1.0"


def run_reasoner_pipeline(
    *,
    script_source: str,
    features: dict[str, Any],
    documents_path: str,
    corpus_version: str = "no-chaindrop",
    behavior_log: dict[str, Any] | None = None,
    classifier_risk: int = 0,
    provider: ReasonerProvider | None = None,
    top_k: int = 8,
) -> dict[str, Any]:
    provider = provider or FixtureReasonerProvider()
    redacted_source = redact_text(script_source)
    summary = build_behavior_summary(features, behavior_log)

    all_docs = load_documents(documents_path)
    active_docs = filter_for_corpus_version(all_docs, corpus_version)
    query = " ".join(
        [
            redacted_source[:2000],
            " ".join(summary.get("capabilities") or []),
            " ".join(summary.get("observables", {}).get("domains") or []),
        ]
    )
    retrieved = retrieve_top_k(query, active_docs, k=top_k)

    reasoner_status = "ok"
    degraded = False
    try:
        reasoner = provider.reason(summary, retrieved, features)
    except (ReasonerSchemaError, Exception):
        reasoner = degraded_verdict(
            summary, features, behavior_log, classifier_risk=classifier_risk
        )
        reasoner_status = "degraded"
        degraded = True

    return {
        "config": "c",
        "pipeline": "classifier+sandbox+rag",
        "behavior_summary": summary,
        "retrieved_chunks": len(retrieved),
        "corpus_version": corpus_version,
        "prompt_version": PROMPT_VERSION,
        "reasoner_status": reasoner_status,
        "degraded": degraded,
        "risk_score": reasoner["risk_score"],
        "action": reasoner["action"],
        "attack_techniques": reasoner["attack_techniques"],
        "matched_campaigns": reasoner["matched_campaigns"],
        "justification": reasoner["justification"],
        "citations": reasoner["citations"],
        "uncertainty": reasoner["uncertainty"],
    }

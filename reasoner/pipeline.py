"""Full config (c) pipeline: summary → retrieve → reasoner."""

from __future__ import annotations

from typing import Any

from rag.corpus import filter_for_corpus_version, load_documents
from rag.redact import redact_text
from rag.retrieve import retrieve_top_k
from reasoner.degraded import degraded_verdict
from reasoner.hard_trips import apply_hard_trips
from reasoner.providers import ReasonerProvider, load_provider, provider_prompt_version
from reasoner.schema import ReasonerSchemaError
from reasoner.summary import build_behavior_summary


def run_reasoner_pipeline(
    *,
    script_source: str,
    features: dict[str, Any],
    documents_path: str,
    corpus_version: str = "no-chaindrop",
    behavior_log: dict[str, Any] | None = None,
    classifier_risk: int = 0,
    provider: ReasonerProvider | None = None,
    provider_name: str | None = None,
    top_k: int = 8,
) -> dict[str, Any]:
    """
    Run the behavior analysis pipeline and produce a reasoned risk assessment.
    
    Parameters:
        script_source (str): Source text to analyze.
        features (dict[str, Any]): Extracted behavioral features supplied to the summary and reasoner.
        documents_path (str): Path to the retrieval corpus.
        corpus_version (str): Corpus version used to select active documents.
        behavior_log (dict[str, Any] | None): Optional observed behavior data.
        classifier_risk (int): Risk score used when generating a degraded verdict.
        provider (ReasonerProvider | None): Optional reasoner provider instance.
        provider_name (str | None): Name of the provider to load when `provider` is not supplied.
        top_k (int): Maximum number of relevant document chunks to retrieve.
    
    Returns:
        dict[str, Any]: Pipeline metadata, behavior summary, retrieval details, reasoner status,
        risk assessment, recommended action, attack techniques, matched campaigns,
        justification, citations, and uncertainty.
    """
    provider = provider or load_provider(provider_name)
    prompt_version = provider_prompt_version(provider)
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

    reasoner = apply_hard_trips(
        reasoner,
        features,
        behavior_log,
        classifier_risk=classifier_risk,
    )

    result = {
        "config": "c",
        "pipeline": "classifier+sandbox+rag",
        "behavior_summary": summary,
        "retrieved_chunks": len(retrieved),
        "corpus_version": corpus_version,
        "prompt_version": prompt_version,
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
    if reasoner.get("hard_trips"):
        result["hard_trips"] = reasoner["hard_trips"]
    return result

"""Run evaluation configurations (a), (b), and (c)."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Callable

from classifier.triage import triage_features
from eval.policy import (
    action_is_positive,
    decide_action,
    risk_from_behavior_log,
    risk_from_features,
    risk_from_triage,
)
from reasoner.pipeline import run_reasoner_pipeline


def _prediction(
    *,
    risk_score: int,
    action: str,
    thresholds: dict[str, int],
    latency_ms: float,
    escalated: bool = False,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload = {
        "risk_score": risk_score,
        "action": action,
        "predicted_malicious": action_is_positive(action),
        "latency_ms": latency_ms,
        "escalated": escalated,
    }
    if extra:
        payload.update(extra)
    return payload


def run_config_a(
    row: dict[str, Any],
    artifact: dict[str, Any],
    thresholds: dict[str, int],
) -> dict[str, Any]:
    started = time.perf_counter()
    decision = triage_features(row["features"], artifact)
    risk_score = risk_from_triage(decision.malicious_probability, decision.label)
    action = decide_action(risk_score, thresholds)
    return _prediction(
        risk_score=risk_score,
        action=action,
        thresholds=thresholds,
        latency_ms=(time.perf_counter() - started) * 1000,
        escalated=False,
        extra={"config": "a", "triage_label": decision.label},
    )


def run_config_b(
    row: dict[str, Any],
    artifact: dict[str, Any],
    thresholds: dict[str, int],
) -> dict[str, Any]:
    started = time.perf_counter()
    decision = triage_features(row["features"], artifact)
    classifier_risk = risk_from_triage(decision.malicious_probability, decision.label)
    risk_score = risk_from_behavior_log(row.get("behavior_log"), classifier_risk)
    action = decide_action(risk_score, thresholds)
    return _prediction(
        risk_score=risk_score,
        action=action,
        thresholds=thresholds,
        latency_ms=(time.perf_counter() - started) * 1000,
        escalated=True,
        extra={"config": "b"},
    )


def run_config_c(
    row: dict[str, Any],
    artifact: dict[str, Any],
    thresholds: dict[str, int],
    *,
    documents_path: Path,
    corpus_version: str,
) -> dict[str, Any]:
    started = time.perf_counter()
    decision = triage_features(row["features"], artifact)
    classifier_risk = risk_from_triage(decision.malicious_probability, decision.label)
    reasoner = run_reasoner_pipeline(
        script_source=str(row.get("script_source") or ""),
        features=row["features"],
        behavior_log=row.get("behavior_log"),
        classifier_risk=classifier_risk,
        documents_path=str(documents_path),
        corpus_version=corpus_version,
    )
    risk_score = max(classifier_risk, int(reasoner["risk_score"]))
    classifier_action = decide_action(classifier_risk, thresholds)
    reasoner_action = reasoner["action"]
    if "block" in {classifier_action, reasoner_action}:
        action = "block"
    elif "quarantine" in {classifier_action, reasoner_action}:
        action = "quarantine"
    else:
        action = decide_action(risk_score, thresholds)
    return _prediction(
        risk_score=risk_score,
        action=action,
        thresholds=thresholds,
        latency_ms=(time.perf_counter() - started) * 1000,
        escalated=True,
        extra={
            "config": "c",
            "reasoner_status": reasoner.get("reasoner_status"),
            "degraded": reasoner.get("degraded"),
            "retrieved_chunks": reasoner.get("retrieved_chunks"),
        },
    )


CONFIG_RUNNERS: dict[str, Callable[..., dict[str, Any]]] = {
    "a": run_config_a,
    "b": run_config_b,
    "c": run_config_c,
}

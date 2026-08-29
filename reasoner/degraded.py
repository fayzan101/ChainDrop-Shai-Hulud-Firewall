"""Degraded heuristic when the LLM/provider is unavailable or returns invalid JSON."""

from __future__ import annotations

from typing import Any


def degraded_verdict(
    summary: dict[str, Any],
    features: dict[str, Any],
    behavior_log: dict[str, Any] | None = None,
    classifier_risk: int = 0,
) -> dict[str, Any]:
    """Never silently allow escalated scripts. Invalid JSON ⇒ quarantine minimum."""
    risk = max(classifier_risk, 45)
    if float(features.get("suspicion_score") or 0) >= 5:
        risk = max(risk, 70)
    if behavior_log and behavior_log.get("canary_hits"):
        risk = max(risk, 90)
    if behavior_log and behavior_log.get("net"):
        risk = max(risk, 75)

    action = "quarantine"
    if risk > 80:
        action = "block"

    return {
        "risk_score": risk,
        "action": action,
        "attack_techniques": ["T1195.002"] if risk >= 70 else [],
        "matched_campaigns": [],
        "justification": (
            "reasoner_status=degraded: classifier and sandbox heuristics only; "
            "LLM/RAG unavailable or returned invalid JSON."
        ),
        "citations": [],
        "uncertainty": summary.get("uncertainty", "high"),
    }

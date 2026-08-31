"""Policy helpers for evaluation configs (a)(b)(c)."""

from __future__ import annotations

from typing import Any

DEFAULT_THRESHOLDS = {"quarantine": 40, "block": 80}


def risk_from_features(features: dict[str, Any]) -> int:
    raw = float(features.get("suspicion_score") or 0)
    score = min(100, round(raw * 10))
    if features.get("unparseable") and raw < 3:
        score = min(score, 25)
    return int(score)


def decide_action(risk_score: int, thresholds: dict[str, int]) -> str:
    if risk_score > thresholds["block"]:
        return "block"
    if risk_score >= thresholds["quarantine"]:
        return "quarantine"
    return "allow"


def risk_from_behavior_log(
    log: dict[str, Any] | None, classifier_risk: int = 0
) -> int:
    score = int(classifier_risk or 0)
    log = log or {}
    canary_hits = len(log.get("canary_hits") or [])
    net_events = len(log.get("net") or [])
    file_reads = len(
        [f for f in (log.get("files") or []) if f.get("operation") == "read"]
    )

    if canary_hits > 0:
        score = max(score, 95)
    if net_events > 0:
        score = max(score, 75)
    if file_reads > 2 and score < 50:
        score = max(score, 45)
    if log.get("timeout"):
        score = max(score, 55)
    return min(100, int(score))


def risk_from_triage(malicious_probability: float, label: str) -> int:
    if label == "benign":
        return int(min(35, malicious_probability * 30))
    if label == "suspicious":
        return int(40 + malicious_probability * 40)
    return int(70 + malicious_probability * 30)


def action_is_positive(action: str) -> bool:
    return action in {"quarantine", "block"}

"""Heuristic hard trips that cannot be overridden by prompt-injected allow verdicts."""

from __future__ import annotations

from typing import Any

# Match FixtureReasonerProvider / summary capability thresholds.
HARD_TRIP_SUSPICION = 5.0
HARD_TRIP_CLASSIFIER_RISK = 40


def hard_trip_reasons(
    features: dict[str, Any],
    behavior_log: dict[str, Any] | None = None,
    *,
    classifier_risk: int = 0,
) -> list[str]:
    reasons: list[str] = []
    suspicion = float(features.get("suspicion_score") or 0)
    if suspicion >= HARD_TRIP_SUSPICION:
        reasons.append(f"suspicion_score>={HARD_TRIP_SUSPICION}")
    if int(classifier_risk or 0) >= HARD_TRIP_CLASSIFIER_RISK:
        reasons.append(f"classifier_risk>={HARD_TRIP_CLASSIFIER_RISK}")
    if behavior_log and behavior_log.get("canary_hits"):
        reasons.append("sandbox_canary_hit")
    if int(features.get("credential_hits") or 0) >= 2 and int(
        features.get("api_text_hits") or 0
    ) >= 2:
        reasons.append("credential_and_api_hits")
    return reasons


def apply_hard_trips(
    verdict: dict[str, Any],
    features: dict[str, Any],
    behavior_log: dict[str, Any] | None = None,
    *,
    classifier_risk: int = 0,
) -> dict[str, Any]:
    """
    If heuristic hard trips fire, never allow — escalate allow → quarantine (or block).

    Policy thresholds and hard trips are code/config, not prompt text, so script-embedded
    \"ignore previous instructions\" / fake allow JSON cannot override them.
    """
    reasons = hard_trip_reasons(
        features, behavior_log, classifier_risk=classifier_risk
    )
    if not reasons:
        return verdict

    out = dict(verdict)
    out["hard_trips"] = reasons
    risk = int(out.get("risk_score") or 0)
    floor = 45
    if "sandbox_canary_hit" in reasons:
        floor = 90
    elif "suspicion_score" in reasons[0] or "credential_and_api_hits" in reasons:
        floor = 70
    risk = max(risk, floor)
    out["risk_score"] = risk

    action = out.get("action")
    if action == "allow":
        out["action"] = "block" if risk > 80 else "quarantine"
        note = (
            f" hard_trip overridden injected/allow verdict ({', '.join(reasons)})."
        )
        out["justification"] = str(out.get("justification") or "") + note
    elif action == "quarantine" and risk > 80:
        out["action"] = "block"

    return out

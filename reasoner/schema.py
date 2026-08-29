"""Validate reasoner output against the Phase 6 contract."""

from __future__ import annotations

from typing import Any

REQUIRED_FIELDS = (
    "risk_score",
    "action",
    "attack_techniques",
    "matched_campaigns",
    "justification",
    "citations",
    "uncertainty",
)


class ReasonerSchemaError(ValueError):
    pass


def validate_reasoner_verdict(payload: dict[str, Any]) -> dict[str, Any]:
    for field in REQUIRED_FIELDS:
        if field not in payload:
            raise ReasonerSchemaError(f"missing required field: {field}")

    action = payload["action"]
    if action not in {"allow", "quarantine", "block"}:
        raise ReasonerSchemaError(f"invalid action: {action!r}")

    risk = int(payload["risk_score"])
    if risk < 0 or risk > 100:
        raise ReasonerSchemaError("risk_score out of range")

    uncertainty = payload["uncertainty"]
    if uncertainty not in {"low", "medium", "high"}:
        raise ReasonerSchemaError(f"invalid uncertainty: {uncertainty!r}")

    if not isinstance(payload["citations"], list):
        raise ReasonerSchemaError("citations must be a list")

    for cite in payload["citations"]:
        if not cite.get("doc_id") or not cite.get("title"):
            raise ReasonerSchemaError("citation missing doc_id or title")

    return payload

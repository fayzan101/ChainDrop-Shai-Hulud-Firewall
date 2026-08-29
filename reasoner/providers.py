"""Reasoner providers (fixture for CI; Claude/local behind same schema in production)."""

from __future__ import annotations

import json
from typing import Any, Protocol

from reasoner.schema import ReasonerSchemaError, validate_reasoner_verdict


class ReasonerProvider(Protocol):
    def reason(
        self,
        summary: dict[str, Any],
        retrieved: list[dict[str, Any]],
        features: dict[str, Any],
    ) -> dict[str, Any]: ...


class FixtureReasonerProvider:
    """Deterministic provider for fixtures — no external API."""

    def reason(
        self,
        summary: dict[str, Any],
        retrieved: list[dict[str, Any]],
        features: dict[str, Any],
    ) -> dict[str, Any]:
        suspicion = float(features.get("suspicion_score") or 0)
        canary = "credential_harvest" in summary.get("capabilities", [])
        citations = [
            {
                "doc_id": chunk["doc_id"],
                "title": chunk["title"],
                "url": chunk.get("url"),
                "date": chunk.get("date"),
            }
            for chunk in retrieved[:3]
        ]
        campaigns = []
        for chunk in retrieved:
            for tag in chunk.get("campaign_tags") or []:
                if tag not in campaigns and tag != "reference":
                    campaigns.append(tag)

        if suspicion >= 5 or canary:
            return {
                "risk_score": 88,
                "action": "block",
                "attack_techniques": ["T1195.002", "T1528"],
                "matched_campaigns": campaigns[:2] or ["shai-hulud-2.0"],
                "justification": (
                    "Retrieved intelligence matches lifecycle credential harvest and "
                    "supply-chain republish patterns seen in Shai-Hulud lineage worms."
                ),
                "citations": citations,
                "uncertainty": summary.get("uncertainty", "medium"),
            }

        return {
            "risk_score": 12,
            "action": "allow",
            "attack_techniques": [],
            "matched_campaigns": [],
            "justification": "No strong overlap with documented worm techniques.",
            "citations": citations,
            "uncertainty": "low",
        }


class InvalidJsonProvider:
    """Test double that returns malformed JSON."""

    def reason(
        self,
        summary: dict[str, Any],
        retrieved: list[dict[str, Any]],
        features: dict[str, Any],
    ) -> dict[str, Any]:
        raise ReasonerSchemaError("simulated invalid provider output")


def parse_provider_payload(raw: str | dict[str, Any]) -> dict[str, Any]:
    if isinstance(raw, dict):
        return validate_reasoner_verdict(raw)
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as err:
        raise ReasonerSchemaError(f"invalid JSON: {err}") from err
    if not isinstance(payload, dict):
        raise ReasonerSchemaError("reasoner output must be a JSON object")
    return validate_reasoner_verdict(payload)

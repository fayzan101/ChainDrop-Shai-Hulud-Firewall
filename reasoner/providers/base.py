"""Shared reasoner provider types and JSON parsing."""

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

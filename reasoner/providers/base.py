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
    ) -> dict[str, Any]: """
        Generate a reasoner verdict from the input summary, retrieved records, and features.
        
        Parameters:
        	summary (dict[str, Any]): Summary data to evaluate.
        	retrieved (list[dict[str, Any]]): Records retrieved for evaluation.
        	features (dict[str, Any]): Feature data used to produce the verdict.
        
        Returns:
        	dict[str, Any]: The reasoner verdict.
        """
        ...


class InvalidJsonProvider:
    """Test double that returns malformed JSON."""

    def reason(
        self,
        summary: dict[str, Any],
        retrieved: list[dict[str, Any]],
        features: dict[str, Any],
    ) -> dict[str, Any]:
        """Simulate a provider that produces invalid output.
        
        Raises:
        	ReasonerSchemaError: Always raised to represent invalid provider output.
        """
        raise ReasonerSchemaError("simulated invalid provider output")


def parse_provider_payload(raw: str | dict[str, Any]) -> dict[str, Any]:
    """
    Parse and validate a reasoner provider payload.
    
    Parameters:
        raw (str | dict[str, Any]): A reasoner verdict or a JSON string containing one.
    
    Returns:
        dict[str, Any]: The validated reasoner verdict.
    
    Raises:
        ReasonerSchemaError: If the string contains invalid JSON, the parsed value is not a JSON object, or the verdict fails validation.
    """
    if isinstance(raw, dict):
        return validate_reasoner_verdict(raw)
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as err:
        raise ReasonerSchemaError(f"invalid JSON: {err}") from err
    if not isinstance(payload, dict):
        raise ReasonerSchemaError("reasoner output must be a JSON object")
    return validate_reasoner_verdict(payload)

"""Unit tests for the shared reasoner provider contract and factory."""

from __future__ import annotations

import json

import pytest

from reasoner.providers import (
    ClaudeReasonerProvider,
    FixtureReasonerProvider,
    InvalidJsonProvider,
    load_provider,
    parse_provider_payload,
    provider_name,
    provider_prompt_version,
)
from reasoner.providers.claude import PROMPT_VERSION as CLAUDE_PROMPT_VERSION
from reasoner.providers.fixture import PROMPT_VERSION as FIXTURE_PROMPT_VERSION
from reasoner.schema import ReasonerSchemaError


VALID_VERDICT = {
    "risk_score": 42,
    "action": "quarantine",
    "attack_techniques": ["T1195.002"],
    "matched_campaigns": [],
    "justification": "Suspicious lifecycle behavior needs review.",
    "citations": [],
    "uncertainty": "high",
}


@pytest.mark.parametrize(
    "raw",
    [VALID_VERDICT, json.dumps(VALID_VERDICT)],
    ids=["dictionary", "json-string"],
)
def test_parse_provider_payload_accepts_supported_inputs(raw: object) -> None:
    assert parse_provider_payload(raw) == VALID_VERDICT  # type: ignore[arg-type]


@pytest.mark.parametrize("raw", ["[]", "null", '"verdict"', "42"])
def test_parse_provider_payload_rejects_non_object_json(raw: str) -> None:
    with pytest.raises(ReasonerSchemaError, match="must be a JSON object"):
        parse_provider_payload(raw)


def test_parse_provider_payload_validates_dictionary_input() -> None:
    invalid = {**VALID_VERDICT, "action": "permit"}

    with pytest.raises(ReasonerSchemaError, match="invalid action"):
        parse_provider_payload(invalid)


def test_invalid_json_provider_raises_schema_error() -> None:
    with pytest.raises(ReasonerSchemaError, match="simulated invalid provider output"):
        InvalidJsonProvider().reason({}, [], {})


def test_load_provider_defaults_to_fixture_when_environment_is_unset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("REASONER_PROVIDER", raising=False)

    assert isinstance(load_provider(), FixtureReasonerProvider)


@pytest.mark.parametrize("configured", ["claude", " CLAUDE "])
def test_load_provider_normalizes_environment_selection(
    configured: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("REASONER_PROVIDER", configured)

    assert isinstance(load_provider(), ClaudeReasonerProvider)


def test_explicit_provider_selection_overrides_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REASONER_PROVIDER", "claude")

    assert isinstance(load_provider("fixture"), FixtureReasonerProvider)


def test_load_provider_rejects_unknown_selection() -> None:
    with pytest.raises(ValueError, match=r"unknown REASONER_PROVIDER.*fixture\|claude"):
        load_provider("other")


class _CustomProvider:
    def reason(self, summary, retrieved, features):  # type: ignore[no-untyped-def]
        return VALID_VERDICT


@pytest.mark.parametrize(
    ("provider", "expected_name", "expected_prompt_version"),
    [
        (FixtureReasonerProvider(), "fixture", FIXTURE_PROMPT_VERSION),
        (ClaudeReasonerProvider(api_key="test"), "claude", CLAUDE_PROMPT_VERSION),
        (_CustomProvider(), "custom", FIXTURE_PROMPT_VERSION),
    ],
)
def test_provider_metadata_helpers(
    provider: object, expected_name: str, expected_prompt_version: str
) -> None:
    assert provider_name(provider) == expected_name  # type: ignore[arg-type]
    assert provider_prompt_version(provider) == expected_prompt_version  # type: ignore[arg-type]

"""Tests for Claude reasoner provider (mocked HTTP; live test optional)."""

from __future__ import annotations

import json
import os
from pathlib import Path
from unittest.mock import patch

import pytest

from reasoner.pipeline import run_reasoner_pipeline
from reasoner.providers.claude import (
    ClaudeReasonerProvider,
    PROMPT_VERSION,
    build_claude_prompt,
)
from reasoner.providers.factory import load_provider
from reasoner.schema import ReasonerSchemaError
from reasoner.summary import build_behavior_summary

ROOT = Path(__file__).resolve().parents[2]
FIXTURE_CORPUS = ROOT / "fixtures/rag-corpus/documents.jsonl"

_VALID_VERDICT = {
    "risk_score": 85,
    "action": "block",
    "attack_techniques": ["T1195.002"],
    "matched_campaigns": ["shai-hulud-2.0"],
    "justification": "Technique overlap with documented credential harvest lifecycle hooks.",
    "citations": [
        {
            "doc_id": "ti-shulud2-001",
            "title": "Shai-Hulud 2.0 credential theft",
            "url": "https://securitylabs.datadoghq.com/articles/shai-hulud-2.0-npm-worm/",
            "date": "2025-11-24",
        }
    ],
    "uncertainty": "medium",
}


class _FakeResponse:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def read(self) -> bytes:
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None


def test_load_provider_defaults_to_fixture() -> None:
    with patch.dict(os.environ, {}, clear=False):
        os.environ.pop("REASONER_PROVIDER", None)
        provider = load_provider()
        assert provider.__class__.__name__ == "FixtureReasonerProvider"


def test_load_provider_claude_without_key() -> None:
    with patch.dict(os.environ, {"REASONER_PROVIDER": "claude"}, clear=False):
        os.environ.pop("ANTHROPIC_API_KEY", None)
        provider = load_provider()
        with pytest.raises(ReasonerSchemaError, match="ANTHROPIC_API_KEY"):
            provider.reason({}, [], {})


def test_build_claude_prompt_redacts_secrets() -> None:
    summary = build_behavior_summary({"suspicion_score": 6, "credential_hits": 1})
    prompt = build_claude_prompt(
        summary,
        [
            {
                "doc_id": "ti-1",
                "title": "Report",
                "text": "token=supersecretvalue12345678",
                "campaign_tags": ["shai-hulud"],
            }
        ],
        {"api_key": "ghp_abcdefghijklmnopqrstuvwxyz1234567890"},
    )
    assert "ghp_[REDACTED]" in prompt
    assert "supersecretvalue12345678" not in prompt
    assert "technique" in prompt.lower() or "Technique" in prompt


@patch("reasoner.providers.claude.request.urlopen")
def test_claude_provider_parses_valid_api_response(mock_urlopen) -> None:
    mock_urlopen.return_value = _FakeResponse(
        {
            "content": [
                {"type": "text", "text": json.dumps(_VALID_VERDICT)},
            ]
        }
    )
    provider = ClaudeReasonerProvider(api_key="test-key")
    summary = build_behavior_summary({"suspicion_score": 7, "credential_hits": 2})
    verdict = provider.reason(summary, [], {"suspicion_score": 7})
    assert verdict["action"] == "block"
    assert verdict["risk_score"] == 85
    sent = mock_urlopen.call_args[0][0]
    assert sent.headers.get("X-api-key") == "test-key"
    body = json.loads(sent.data.decode("utf-8"))
    assert "ghp_" not in json.dumps(body)


@patch("reasoner.providers.claude.request.urlopen")
def test_claude_provider_rejects_invalid_json(mock_urlopen) -> None:
    mock_urlopen.return_value = _FakeResponse(
        {"content": [{"type": "text", "text": "{not-json"}]}
    )
    provider = ClaudeReasonerProvider(api_key="test-key")
    with pytest.raises(ReasonerSchemaError):
        provider.reason(build_behavior_summary({"suspicion_score": 5}), [], {})


def test_claude_provider_missing_key_degrades_pipeline() -> None:
    result = run_reasoner_pipeline(
        script_source="child_process spawn",
        features={"suspicion_score": 6, "api_text_hits": 3},
        documents_path=str(FIXTURE_CORPUS),
        provider_name="claude",
    )
    assert result["reasoner_status"] == "degraded"
    assert result["action"] in {"quarantine", "block"}


@patch("reasoner.providers.claude.request.urlopen")
def test_claude_provider_sets_prompt_version(mock_urlopen) -> None:
    mock_urlopen.return_value = _FakeResponse(
        {"content": [{"type": "text", "text": json.dumps(_VALID_VERDICT)}]}
    )
    with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"}):
        result = run_reasoner_pipeline(
            script_source="require('child_process')",
            features={"suspicion_score": 8, "credential_hits": 2},
            documents_path=str(FIXTURE_CORPUS),
            provider_name="claude",
        )
    assert result["reasoner_status"] == "ok"
    assert result["prompt_version"] == PROMPT_VERSION


@pytest.mark.skipif(
    os.environ.get("RUN_LIVE_LLM") != "1",
    reason="set RUN_LIVE_LLM=1 to call Anthropic API",
)
def test_claude_live_integration() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        pytest.skip("ANTHROPIC_API_KEY not set")
    result = run_reasoner_pipeline(
        script_source="require('child_process').spawn('sh', ['-c', 'curl evil']);",
        features={"suspicion_score": 8, "credential_hits": 2, "api_text_hits": 4},
        documents_path=str(FIXTURE_CORPUS),
        provider_name="claude",
    )
    assert result["reasoner_status"] == "ok"
    assert result["action"] in {"quarantine", "block"}

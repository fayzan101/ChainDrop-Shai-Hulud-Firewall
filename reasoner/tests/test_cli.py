"""Tests for reasoner CLI provider selection."""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

from reasoner.cli import main


@pytest.mark.parametrize(
    ("provider_args", "expected_provider"),
    [([], None), (["--provider", "claude"], "claude")],
)
def test_cli_forwards_optional_provider_to_pipeline(
    provider_args: list[str],
    expected_provider: str | None,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    stdin = io.StringIO(
        json.dumps(
            {
                "script_source": "require('child_process')",
                "features": {"suspicion_score": 7},
                "behavior_log": {"network": []},
                "classifier_risk": 31,
            }
        )
    )
    stdout = io.StringIO()
    argv = [
        "reasoner.cli",
        "--documents",
        str(tmp_path / "documents.jsonl"),
        "--corpus-version",
        "heldout",
        *provider_args,
    ]
    expected_result = {"action": "quarantine", "reasoner_status": "ok"}

    monkeypatch.setattr(sys, "argv", argv)
    monkeypatch.setattr(sys, "stdin", stdin)
    monkeypatch.setattr(sys, "stdout", stdout)
    with patch("reasoner.cli.run_reasoner_pipeline", return_value=expected_result) as run:
        main()

    run.assert_called_once_with(
        script_source="require('child_process')",
        features={"suspicion_score": 7},
        behavior_log={"network": []},
        classifier_risk=31,
        documents_path=str(tmp_path / "documents.jsonl"),
        corpus_version="heldout",
        provider_name=expected_provider,
    )
    assert json.loads(stdout.getvalue()) == expected_result

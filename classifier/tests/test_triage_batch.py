"""Tests for classifier.triage_batch CLI."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import joblib

from classifier.synthetic_data import build_synthetic_rows
from classifier.train import train_from_rows
from classifier.triage_batch import triage_batch

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_triage_batch_module(tmp_path: Path) -> None:
    result = train_from_rows(build_synthetic_rows(), tmp_path)
    artifact = joblib.load(result.artifact_path)
    benign = next(r for r in build_synthetic_rows() if r["label"] == "benign")
    malicious = next(r for r in build_synthetic_rows() if r["label"] == "malicious")
    out = triage_batch([benign["features"], malicious["features"]], result.artifact_path)
    assert out["backend"] == "ml"
    assert out["model_version"].startswith("triage-")
    assert out["decisions"][1]["risk_score"] > out["decisions"][0]["risk_score"]


def test_triage_batch_cli(tmp_path: Path) -> None:
    result = train_from_rows(build_synthetic_rows(), tmp_path)
    benign = next(r for r in build_synthetic_rows() if r["label"] == "benign")
    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "classifier.triage_batch",
            "--artifact",
            str(result.artifact_path),
        ],
        input=json.dumps({"features": [benign["features"]]}),
        text=True,
        capture_output=True,
        check=True,
        cwd=REPO_ROOT,
        env={**os.environ, "PYTHONPATH": str(REPO_ROOT)},
    )
    payload = json.loads(proc.stdout)
    assert payload["backend"] == "ml"
    assert payload["decisions"][0]["label"] in {"benign", "suspicious", "escalate"}

"""Tests for held-out evaluation harness."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from classifier.schema import HELD_OUT_CAMPAIGN
from classifier.synthetic_data import chaindrop_leak_row
from classifier.train import HeldOutLeakError, assert_no_heldout_leak
from eval.configs import run_config_a, run_config_c
from eval.dataset import build_eval_rows, split_rows
from eval.guards import assert_heldout_rows, assert_no_chaindrop_corpus
from eval.metrics import compute_metrics
from eval.policy import decide_action, risk_from_behavior_log
from eval.run_heldout import run_evaluation
from eval.thresholds import freeze_thresholds
from rag.corpus import load_documents

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_build_eval_rows_include_heldout_chaindrop() -> None:
    rows = build_eval_rows(seed=1, heldout_chaindrop=5, heldout_benign=3)
    parts = split_rows(rows)
    assert len(parts["heldout"]) == 8
    chaindrop = [
        r for r in parts["heldout"] if r.get("campaign") == HELD_OUT_CAMPAIGN
    ]
    assert len(chaindrop) == 5


def test_assert_no_chaindrop_corpus_fixture() -> None:
    docs = REPO_ROOT / "fixtures" / "rag-corpus" / "documents.jsonl"
    health = assert_no_chaindrop_corpus(docs, "no-chaindrop")
    assert health["chaindrop_documents"] == 0


def test_trainable_rows_reject_chaindrop_leak() -> None:
    rows = build_eval_rows(seed=2)
    trainable = [r for r in rows if r.get("split") in {"train", "val"}]
    with pytest.raises(HeldOutLeakError):
        assert_no_heldout_leak(trainable + [chaindrop_leak_row()])


def test_config_a_blocks_high_suspicion_chaindrop(tmp_path: Path) -> None:
    import joblib

    from classifier.train import train_from_rows

    rows = build_eval_rows(seed=3)
    parts = split_rows(rows)
    artifact_dir = tmp_path / "artifacts"
    train_from_rows(parts["train"], artifact_dir, seed=3)
    artifact = joblib.load(artifact_dir / "triage.joblib")
    thresholds = freeze_thresholds(parts["val"], artifact)

    chaindrop = next(
        r for r in parts["heldout"] if r.get("campaign") == HELD_OUT_CAMPAIGN
    )
    pred = run_config_a(chaindrop, artifact, thresholds)
    assert pred["predicted_malicious"] is True


def test_config_b_elevates_on_canary_hits() -> None:
    risk = risk_from_behavior_log(
        {
            "canary_hits": [{"canary_id": "npm_token"}],
            "net": [],
            "files": [],
            "timeout": False,
        },
        classifier_risk=20,
    )
    assert risk >= 95
    assert decide_action(risk, {"quarantine": 40, "block": 80}) == "block"


def test_config_c_uses_no_chaindrop_corpus() -> None:
    rows = build_eval_rows(seed=4)
    parts = split_rows(rows)
    import joblib
    from classifier.train import train_from_rows

    artifact_dir = REPO_ROOT / "classifier" / "artifacts"
    if not (artifact_dir / "triage.joblib").exists():
        train_from_rows(parts["train"], artifact_dir, seed=4)
    artifact = joblib.load(artifact_dir / "triage.joblib")
    thresholds = {"quarantine": 40, "block": 80}
    chaindrop = next(
        r for r in parts["heldout"] if r.get("campaign") == HELD_OUT_CAMPAIGN
    )
    pred = run_config_c(
        chaindrop,
        artifact,
        thresholds,
        documents_path=REPO_ROOT / "fixtures" / "rag-corpus" / "documents.jsonl",
        corpus_version="no-chaindrop",
    )
    assert pred["config"] == "c"
    assert pred["predicted_malicious"] is True
    docs = load_documents(REPO_ROOT / "fixtures" / "rag-corpus" / "documents.jsonl")
    assert "chaindrop" not in {
        tag.lower()
        for doc in docs
        if not doc.exclude_from_heldout_corpus
        for tag in doc.campaign_tags
    }


def test_run_heldout_writes_results(tmp_path: Path) -> None:
    output = tmp_path / "results"
    payload = run_evaluation(
        repo_root=REPO_ROOT,
        output_dir=output,
        configs=["a"],
        seed=7,
    )
    assert (output / "heldout-results.json").exists()
    assert (output / "heldout-results.md").exists()
    assert payload["pins"]["corpus_version"] == "no-chaindrop"
    assert payload["corpus_health"]["chaindrop_documents"] == 0
    saved = json.loads((output / "heldout-results.json").read_text(encoding="utf-8"))
    assert "a" in saved["configurations"]


def test_metrics_chaindrop_recall() -> None:
    rows = [
        {"label": "malicious", "campaign": "chaindrop"},
        {"label": "benign", "campaign": None},
    ]
    preds = [
        {"predicted_malicious": True, "latency_ms": 1.0, "escalated": False},
        {"predicted_malicious": False, "latency_ms": 1.0, "escalated": False},
    ]
    metrics = compute_metrics(rows, preds)
    assert metrics.chaindrop_recall == 1.0
    assert metrics.fpr == 0.0

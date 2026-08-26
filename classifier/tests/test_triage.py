"""Phase 3 triage classifier tests (synthetic data only; no malware I/O)."""

from __future__ import annotations

from pathlib import Path

import pytest

from classifier.explain import top_feature_contributions
from classifier.schema import HELD_OUT_CAMPAIGN, MODEL_VERSION
from classifier.synthetic_data import build_synthetic_rows, chaindrop_leak_row
from classifier.train import HeldOutLeakError, assert_no_heldout_leak, train_from_rows
from classifier.triage import triage_features


def test_trainer_refuses_chaindrop_rows() -> None:
    rows = build_synthetic_rows() + [chaindrop_leak_row()]
    with pytest.raises(HeldOutLeakError, match=HELD_OUT_CAMPAIGN):
        assert_no_heldout_leak(rows)


def test_trainer_refuses_heldout_split() -> None:
    row = build_synthetic_rows()[0].copy()
    row["campaign"] = "shai-hulud"
    row["split"] = "heldout"
    with pytest.raises(HeldOutLeakError, match="heldout"):
        assert_no_heldout_leak([row])


def test_train_and_triage_synthetic(tmp_path: Path) -> None:
    rows = build_synthetic_rows()
    result = train_from_rows(rows, tmp_path)
    assert result.model_version == MODEL_VERSION
    assert result.n_train > 0
    assert 0.0 <= result.val_fpr <= 1.0
    # Synthetic separation should be strong; keep a soft bound for CI noise.
    assert result.val_fpr <= 0.25

    import joblib

    artifact = joblib.load(result.artifact_path)
    benign = next(r for r in rows if r["label"] == "benign")
    malicious = next(r for r in rows if r["label"] == "malicious")
    b = triage_features(benign["features"], artifact)
    m = triage_features(malicious["features"], artifact)
    assert b.model_version == MODEL_VERSION
    assert b.label in {"benign", "suspicious", "escalate"}
    assert m.label in {"suspicious", "escalate"}
    assert m.malicious_probability >= b.malicious_probability

    contrib = top_feature_contributions(malicious["features"], artifact)
    assert len(contrib) >= 1
    assert "feature" in contrib[0]

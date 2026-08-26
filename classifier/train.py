"""Train triage models. Refuses ChainDrop / held-out rows."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix, f1_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from classifier.schema import (
    FEATURE_KEYS,
    FEATURE_SCHEMA_VERSION,
    HELD_OUT_CAMPAIGN,
    MODEL_VERSION,
)
from classifier.vectorize import features_to_vector


class HeldOutLeakError(ValueError):
    """Raised when ChainDrop or heldout-split rows appear in training input."""


@dataclass
class TrainResult:
    model_version: str
    feature_schema_version: str
    n_train: int
    n_val: int
    val_fpr: float
    val_f1: float
    artifact_path: Path


def assert_no_heldout_leak(rows: list[dict[str, Any]]) -> None:
    for row in rows:
        campaign = (row.get("campaign") or "").lower()
        split = (row.get("split") or "").lower()
        if campaign == HELD_OUT_CAMPAIGN:
            raise HeldOutLeakError(
                f"refusing to train on campaign={HELD_OUT_CAMPAIGN!r} "
                f"(script_id={row.get('script_id')!r})"
            )
        if split == "heldout":
            raise HeldOutLeakError(
                f"refusing to train on split=heldout (script_id={row.get('script_id')!r})"
            )


def _xy(rows: list[dict[str, Any]]) -> tuple[np.ndarray, np.ndarray]:
    xs = [features_to_vector(r["features"]) for r in rows]
    ys = [1 if r.get("label") == "malicious" else 0 for r in rows]
    return np.asarray(xs, dtype=float), np.asarray(ys, dtype=int)


def _false_positive_rate(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    denom = tn + fp
    return float(fp / denom) if denom else 0.0


def train_from_rows(
    rows: list[dict[str, Any]],
    artifact_dir: Path,
    *,
    seed: int = 42,
) -> TrainResult:
    assert_no_heldout_leak(rows)
    train_rows = [r for r in rows if r.get("split") != "val"]
    val_rows = [r for r in rows if r.get("split") == "val"]
    if not train_rows:
        raise ValueError("no training rows")
    if not val_rows:
        val_rows = train_rows

    x_train, y_train = _xy(train_rows)
    x_val, y_val = _xy(val_rows)

    linear = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "clf",
                LogisticRegression(
                    max_iter=1000,
                    random_state=seed,
                    class_weight="balanced",
                ),
            ),
        ]
    )
    tree = HistGradientBoostingClassifier(
        max_depth=4,
        learning_rate=0.1,
        max_iter=80,
        random_state=seed,
    )
    linear.fit(x_train, y_train)
    tree.fit(x_train, y_train)

    # Prefer the tree for the shipped artifact; keep linear for comparison metrics.
    y_pred = tree.predict(x_val)
    val_fpr = _false_positive_rate(y_val, y_pred)
    val_f1 = float(f1_score(y_val, y_pred, zero_division=0))

    artifact_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = artifact_dir / "triage.joblib"
    meta = {
        "model_version": MODEL_VERSION,
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "feature_keys": FEATURE_KEYS,
        "val_fpr": val_fpr,
        "val_f1": val_f1,
        "n_train": len(train_rows),
        "n_val": len(val_rows),
        "backend": "sklearn.HistGradientBoostingClassifier",
        "linear_backend": "sklearn.LogisticRegression",
        "notes": (
            "Trained on synthetic feature rows (generations 1–3 + benign). "
            "ChainDrop excluded. Replace with frozen paper model when the labeled store is ready."
        ),
    }
    joblib.dump({"tree": tree, "linear": linear, "meta": meta}, artifact_path)
    (artifact_dir / "triage.meta.json").write_text(
        json.dumps(meta, indent=2) + "\n",
        encoding="utf-8",
    )
    return TrainResult(
        model_version=MODEL_VERSION,
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        n_train=len(train_rows),
        n_val=len(val_rows),
        val_fpr=val_fpr,
        val_f1=val_f1,
        artifact_path=artifact_path,
    )


def main() -> None:
    from classifier.synthetic_data import build_synthetic_rows

    root = Path(__file__).resolve().parents[1]
    out = root / "classifier" / "artifacts"
    result = train_from_rows(build_synthetic_rows(), out)
    print(json.dumps(result.__dict__ | {"artifact_path": str(result.artifact_path)}, indent=2))


if __name__ == "__main__":
    main()

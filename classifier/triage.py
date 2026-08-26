"""Inference: map feature vectors to benign | suspicious | escalate."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from classifier.schema import FEATURE_SCHEMA_VERSION, MODEL_VERSION, TRIAGE_LABELS
from classifier.vectorize import features_to_vector

# Probability of malicious class → triage band (calibration for synthetic model).
BENIGN_MAX = 0.30
ESCALATE_MIN = 0.70


@dataclass
class TriageDecision:
    label: str
    confidence: float
    malicious_probability: float
    model_version: str
    feature_schema_version: str
    escalate_recommended: bool


def load_artifact(path: Path) -> dict[str, Any]:
    return joblib.load(path)


def probability_to_label(p_malicious: float) -> tuple[str, float]:
    if p_malicious < BENIGN_MAX:
        return "benign", 1.0 - p_malicious
    if p_malicious >= ESCALATE_MIN:
        return "escalate", p_malicious
    # Mid band: confidence is distance from nearest edge.
    mid = (BENIGN_MAX + ESCALATE_MIN) / 2
    conf = 1.0 - abs(p_malicious - mid) / (mid - BENIGN_MAX)
    return "suspicious", float(max(0.0, min(1.0, conf)))


def triage_features(
    features: dict[str, Any],
    artifact: dict[str, Any],
) -> TriageDecision:
    tree = artifact["tree"]
    meta = artifact.get("meta") or {}
    vector = np.asarray([features_to_vector(features)], dtype=float)
    proba = tree.predict_proba(vector)[0]
    # classes_ may be [0, 1] or only one class in degenerate fits
    classes = list(tree.classes_)
    if 1 in classes:
        p_mal = float(proba[classes.index(1)])
    else:
        p_mal = 0.0
    label, confidence = probability_to_label(p_mal)
    assert label in TRIAGE_LABELS
    return TriageDecision(
        label=label,
        confidence=confidence,
        malicious_probability=p_mal,
        model_version=str(meta.get("model_version") or MODEL_VERSION),
        feature_schema_version=str(
            meta.get("feature_schema_version") or FEATURE_SCHEMA_VERSION
        ),
        escalate_recommended=label in {"suspicious", "escalate"} or bool(features.get("unparseable")),
    )


def triage_features_dict(
    features: dict[str, Any],
    artifact: dict[str, Any],
) -> dict[str, Any]:
    return asdict(triage_features(features, artifact))

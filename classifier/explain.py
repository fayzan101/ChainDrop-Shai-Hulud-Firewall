"""Offline explanation helpers for blocked / escalated scripts (not the hot path)."""

from __future__ import annotations

from typing import Any

import numpy as np

from classifier.schema import FEATURE_KEYS
from classifier.vectorize import features_to_vector


def top_feature_contributions(
    features: dict[str, Any],
    artifact: dict[str, Any],
    *,
    top_k: int = 8,
) -> list[dict[str, float | str]]:
    """
    Approximate local explanation without requiring the `shap` package.

    Uses per-feature value × global tree feature importances when available,
    otherwise ranks by absolute feature magnitude.
    """
    tree = artifact["tree"]
    vector = np.asarray(features_to_vector(features), dtype=float)
    importances = getattr(tree, "feature_importances_", None)
    if importances is None:
        scores = np.abs(vector)
    else:
        scores = np.abs(vector) * np.asarray(importances, dtype=float)
    order = np.argsort(scores)[::-1][:top_k]
    out: list[dict[str, float | str]] = []
    for idx in order:
        out.append(
            {
                "feature": FEATURE_KEYS[int(idx)],
                "value": float(vector[int(idx)]),
                "score": float(scores[int(idx)]),
            }
        )
    return out

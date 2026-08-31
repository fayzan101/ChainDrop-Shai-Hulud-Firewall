"""Freeze policy thresholds on generation 1–3 validation before ChainDrop scoring."""

from __future__ import annotations

from typing import Any

from eval.configs import run_config_a
from eval.metrics import compute_metrics
from eval.policy import DEFAULT_THRESHOLDS


def freeze_thresholds(
    val_rows: list[dict[str, Any]],
    artifact: dict[str, Any],
    *,
    max_fpr: float = 0.02,
) -> dict[str, int]:
    """Grid-search quarantine/block on val; fall back to defaults."""
    candidates: list[dict[str, int]] = []
    for quarantine in (30, 35, 40, 45, 50):
        for block in (75, 80, 85, 90):
            if block <= quarantine:
                continue
            candidates.append({"quarantine": quarantine, "block": block})

    best: dict[str, int] | None = None
    best_f1 = -1.0

    for thresholds in candidates:
        predictions = [run_config_a(row, artifact, thresholds) for row in val_rows]
        metrics = compute_metrics(val_rows, predictions)
        if metrics.fpr > max_fpr:
            continue
        if metrics.f1 > best_f1:
            best = thresholds
            best_f1 = metrics.f1

    return best or dict(DEFAULT_THRESHOLDS)

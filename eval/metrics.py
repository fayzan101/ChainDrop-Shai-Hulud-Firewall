"""Classification metrics for held-out evaluation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from classifier.schema import HELD_OUT_CAMPAIGN


@dataclass
class MetricBundle:
    precision: float
    recall: float
    f1: float
    fpr: float
    chaindrop_recall: float
    tp: int
    fp: int
    tn: int
    fn: int
    chaindrop_tp: int
    chaindrop_total: int
    escalation_rate: float
    latency_ms_p50: float
    latency_ms_p95: float

    def as_dict(self) -> dict[str, Any]:
        return {
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "f1": round(self.f1, 4),
            "fpr": round(self.fpr, 4),
            "chaindrop_recall": round(self.chaindrop_recall, 4),
            "tp": self.tp,
            "fp": self.fp,
            "tn": self.tn,
            "fn": self.fn,
            "chaindrop_tp": self.chaindrop_tp,
            "chaindrop_total": self.chaindrop_total,
            "escalation_rate": round(self.escalation_rate, 4),
            "latency_ms_p50": round(self.latency_ms_p50, 2),
            "latency_ms_p95": round(self.latency_ms_p95, 2),
        }


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, int(round((pct / 100) * (len(ordered) - 1))))
    return float(ordered[index])


def compute_metrics(
    rows: list[dict[str, Any]],
    predictions: list[dict[str, Any]],
) -> MetricBundle:
    if len(rows) != len(predictions):
        raise ValueError("rows and predictions length mismatch")

    tp = fp = tn = fn = 0
    chaindrop_tp = chaindrop_total = 0
    escalated = 0
    latencies: list[float] = []

    for row, pred in zip(rows, predictions, strict=True):
        actual = row.get("label") == "malicious"
        predicted = bool(pred.get("predicted_malicious"))
        if pred.get("escalated"):
            escalated += 1
        latencies.append(float(pred.get("latency_ms") or 0))

        if actual and predicted:
            tp += 1
        elif not actual and predicted:
            fp += 1
        elif actual and not predicted:
            fn += 1
        else:
            tn += 1

        if (row.get("campaign") or "").lower() == HELD_OUT_CAMPAIGN:
            chaindrop_total += 1
            if predicted:
                chaindrop_tp += 1

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall)
        else 0.0
    )
    fpr = fp / (fp + tn) if (fp + tn) else 0.0
    chaindrop_recall = (
        chaindrop_tp / chaindrop_total if chaindrop_total else 0.0
    )
    escalation_rate = escalated / len(rows) if rows else 0.0

    return MetricBundle(
        precision=precision,
        recall=recall,
        f1=f1,
        fpr=fpr,
        chaindrop_recall=chaindrop_recall,
        tp=tp,
        fp=fp,
        tn=tn,
        fn=fn,
        chaindrop_tp=chaindrop_tp,
        chaindrop_total=chaindrop_total,
        escalation_rate=escalation_rate,
        latency_ms_p50=_percentile(latencies, 50),
        latency_ms_p95=_percentile(latencies, 95),
    )

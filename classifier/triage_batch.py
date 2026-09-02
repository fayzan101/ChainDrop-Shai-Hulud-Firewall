"""Batch triage inference for action scan (stdin JSON → stdout JSON)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import joblib

from classifier.triage import triage_features_dict
from eval.policy import risk_from_triage


def triage_batch(
    features_list: list[dict[str, Any]],
    artifact_path: Path,
) -> dict[str, Any]:
    artifact = joblib.load(artifact_path)
    meta = artifact.get("meta") or {}
    decisions: list[dict[str, Any]] = []
    for features in features_list:
        decision = triage_features_dict(features, artifact)
        decision["risk_score"] = risk_from_triage(
            float(decision["malicious_probability"]),
            str(decision["label"]),
        )
        decisions.append(decision)
    return {
        "backend": "ml",
        "model_version": str(meta.get("model_version") or "unknown"),
        "feature_schema_version": str(meta.get("feature_schema_version") or "1.0.0"),
        "decisions": decisions,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch ML triage for action scan")
    parser.add_argument(
        "--artifact",
        type=Path,
        required=True,
        help="Path to triage.joblib artifact",
    )
    args = parser.parse_args()
    payload = json.load(sys.stdin)
    features_list = payload.get("features") or []
    result = triage_batch(features_list, args.artifact)
    json.dump(result, sys.stdout)


if __name__ == "__main__":
    main()

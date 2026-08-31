"""Held-out ChainDrop evaluation harness — configs (a)(b)(c)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib

from classifier.train import train_from_rows
from eval.configs import CONFIG_RUNNERS, run_config_c
from eval.dataset import build_eval_rows, split_rows
from eval.guards import assert_heldout_rows, assert_no_chaindrop_corpus
from eval.metrics import compute_metrics
from eval.pins import build_pins
from eval.thresholds import freeze_thresholds


def _markdown_table(results: dict[str, Any]) -> str:
    lines = [
        "| Config | Precision | Recall | F1 | FPR | ChainDrop recall | Escalation rate | p50 ms | p95 ms |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for config_id, metrics in results["configurations"].items():
        lines.append(
            f"| ({config_id}) | {metrics['precision']:.4f} | {metrics['recall']:.4f} | "
            f"{metrics['f1']:.4f} | {metrics['fpr']:.4f} | {metrics['chaindrop_recall']:.4f} | "
            f"{metrics['escalation_rate']:.4f} | {metrics['latency_ms_p50']:.1f} | "
            f"{metrics['latency_ms_p95']:.1f} |"
        )
    return "\n".join(lines) + "\n"


def run_evaluation(
    *,
    repo_root: Path,
    corpus_version: str = "no-chaindrop",
    corpus_documents: Path | None = None,
    artifact_dir: Path | None = None,
    output_dir: Path | None = None,
    configs: list[str] | None = None,
    seed: int = 42,
) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    corpus_documents = corpus_documents or (
        repo_root / "fixtures" / "rag-corpus" / "documents.jsonl"
    )
    artifact_dir = artifact_dir or (repo_root / "classifier" / "artifacts")
    output_dir = output_dir or (repo_root / "eval" / "results")
    configs = configs or ["a", "b", "c"]

    corpus_health = assert_no_chaindrop_corpus(corpus_documents, corpus_version)
    rows = build_eval_rows(seed=seed)
    partitions = split_rows(rows)
    assert_heldout_rows(rows)

    train_rows = partitions["train"]
    artifact_path = artifact_dir / "triage.joblib"
    if not artifact_path.exists():
        train_from_rows(train_rows, artifact_dir, seed=seed)
    artifact = joblib.load(artifact_path)

    thresholds = freeze_thresholds(partitions["val"], artifact)
    pins = build_pins(
        repo_root=repo_root,
        corpus_version=corpus_version,
        corpus_documents_path=corpus_documents,
        artifact_dir=artifact_dir,
        thresholds=thresholds,
        seed=seed,
    )

    heldout_rows = partitions["heldout"]
    configuration_metrics: dict[str, Any] = {}

    for config_id in configs:
        if config_id not in CONFIG_RUNNERS:
            raise ValueError(f"unknown config {config_id!r}")
        runner = CONFIG_RUNNERS[config_id]
        predictions: list[dict[str, Any]] = []
        for row in heldout_rows:
            if config_id == "c":
                pred = run_config_c(
                    row,
                    artifact,
                    thresholds,
                    documents_path=corpus_documents,
                    corpus_version=corpus_version,
                )
            else:
                pred = runner(row, artifact, thresholds)
            predictions.append(pred)
        configuration_metrics[config_id] = compute_metrics(
            heldout_rows, predictions
        ).as_dict()

    payload = {
        "pins": pins.as_dict(),
        "corpus_health": corpus_health,
        "dataset": {
            "train_rows": len(partitions["train"]),
            "val_rows": len(partitions["val"]),
            "heldout_rows": len(heldout_rows),
            "heldout_chaindrop_rows": sum(
                1
                for row in heldout_rows
                if (row.get("campaign") or "").lower() == "chaindrop"
            ),
        },
        "configurations": configuration_metrics,
        "markdown_table": _markdown_table(
            {"configurations": configuration_metrics}
        ),
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "heldout-results.json").write_text(
        json.dumps(payload, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "heldout-results.md").write_text(
        "# Held-out evaluation results\n\n"
        f"Protocol commit: `{pins.git_commit}`\n\n"
        f"Corpus pin: `{corpus_version}` (`chaindrop_documents={corpus_health['chaindrop_documents']}`)\n\n"
        f"Frozen thresholds: quarantine={thresholds['quarantine']}, block={thresholds['block']}\n\n"
        + payload["markdown_table"],
        encoding="utf-8",
    )
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run held-out ChainDrop evaluation for configs (a)(b)(c)"
    )
    parser.add_argument(
        "--config",
        action="append",
        choices=["a", "b", "c"],
        help="Configuration to run (default: all)",
    )
    parser.add_argument(
        "--corpus-version",
        default="no-chaindrop",
        help="RAG corpus pin (must exclude ChainDrop for eval)",
    )
    parser.add_argument(
        "--corpus-documents",
        type=Path,
        default=None,
        help="Path to documents.jsonl",
    )
    parser.add_argument(
        "--artifact-dir",
        type=Path,
        default=None,
        help="Classifier artifact directory",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Directory for heldout-results.json/md",
    )
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    payload = run_evaluation(
        repo_root=repo_root,
        corpus_version=args.corpus_version,
        corpus_documents=args.corpus_documents,
        artifact_dir=args.artifact_dir,
        output_dir=args.output_dir,
        configs=args.config or None,
        seed=args.seed,
    )
    print(json.dumps(payload["configurations"], indent=2))
    print(payload["markdown_table"])


if __name__ == "__main__":
    main()

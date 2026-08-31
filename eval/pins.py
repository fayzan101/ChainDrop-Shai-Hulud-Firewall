"""Record frozen pins for the held-out evaluation report."""

from __future__ import annotations

import json
import subprocess
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass
class FrozenPins:
    protocol: str
    git_commit: str
    corpus_version: str
    corpus_documents_path: str
    model_version: str
    feature_schema_version: str
    thresholds: dict[str, int]
    seed: int
    recorded_at: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def git_commit_hash(repo_root: Path) -> str:
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_root,
            text=True,
        )
        return out.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def load_model_meta(artifact_dir: Path) -> dict[str, Any]:
    meta_path = artifact_dir / "triage.meta.json"
    if meta_path.exists():
        return json.loads(meta_path.read_text(encoding="utf-8"))
    return {}


def build_pins(
    *,
    repo_root: Path,
    corpus_version: str,
    corpus_documents_path: Path,
    artifact_dir: Path,
    thresholds: dict[str, int],
    seed: int,
) -> FrozenPins:
    meta = load_model_meta(artifact_dir)
    return FrozenPins(
        protocol="held-out-generation-v1",
        git_commit=git_commit_hash(repo_root),
        corpus_version=corpus_version,
        corpus_documents_path=str(corpus_documents_path.relative_to(repo_root)),
        model_version=str(meta.get("model_version") or "unknown"),
        feature_schema_version=str(meta.get("feature_schema_version") or "unknown"),
        thresholds=thresholds,
        seed=seed,
        recorded_at=datetime.now(timezone.utc).isoformat(),
    )

"""Synthetic feature rows for Phase 3 until the real malicious store is ready."""

from __future__ import annotations

import random
from typing import Any


def _benign_row(rng: random.Random, i: int) -> dict[str, Any]:
    hook = rng.choice(["install", "postinstall", "preinstall"])
    return {
        "script_id": f"synth-benign-{i}",
        "label": "benign",
        "campaign": None,
        "generation": None,
        "split": "train" if i % 5 else "val",
        "features": {
            "hook": hook,
            "unparseable": True if hook and rng.random() < 0.4 else False,
            "entropy": rng.uniform(2.0, 4.5),
            "source_length": rng.randint(10, 80),
            "eval_count": 0,
            "function_ctor_count": 0,
            "spawn_count": 0,
            "http_count": 0,
            "fs_count": 0,
            "homedir_count": 0,
            "credential_hits": 0,
            "api_text_hits": 0,
            "download_and_execute": False,
            "ident_mean_length": rng.uniform(3.0, 8.0),
            "suspicion_score": rng.uniform(0.0, 2.0),
        },
    }


def _malicious_row(rng: random.Random, i: int, campaign: str, generation: int) -> dict[str, Any]:
    hook = rng.choice(["preinstall", "install", "postinstall"])
    credential = rng.randint(1, 4)
    api = rng.randint(1, 5)
    return {
        "script_id": f"synth-{campaign}-{i}",
        "label": "malicious",
        "campaign": campaign,
        "generation": generation,
        "split": "train" if i % 5 else "val",
        "features": {
            "hook": hook,
            "unparseable": False,
            "entropy": rng.uniform(4.5, 7.5),
            "source_length": rng.randint(200, 4000),
            "eval_count": rng.randint(0, 3),
            "function_ctor_count": rng.randint(0, 2),
            "spawn_count": rng.randint(1, 4),
            "http_count": rng.randint(1, 5),
            "fs_count": rng.randint(0, 3),
            "homedir_count": rng.randint(1, 3),
            "credential_hits": credential,
            "api_text_hits": api,
            "download_and_execute": rng.random() < 0.7,
            "ident_mean_length": rng.uniform(1.0, 4.0),
            "suspicion_score": float(credential * 3 + api * 2 + rng.randint(2, 8)),
        },
    }


def build_synthetic_rows(seed: int = 42) -> list[dict[str, Any]]:
    """Benign + generations 1–3 only. ChainDrop is never included."""
    rng = random.Random(seed)
    rows: list[dict[str, Any]] = []
    for i in range(40):
        rows.append(_benign_row(rng, i))
    campaigns = [
        ("shai-hulud", 1),
        ("shai-hulud-2.0", 2),
        ("mini-shai-hulud", 3),
    ]
    n = 0
    for campaign, generation in campaigns:
        for _ in range(12):
            rows.append(_malicious_row(rng, n, campaign, generation))
            n += 1
    return rows


def chaindrop_leak_row() -> dict[str, Any]:
    """Illegal train row used only to assert the trainer rejects ChainDrop."""
    return {
        "script_id": "leak-chaindrop",
        "label": "malicious",
        "campaign": "chaindrop",
        "generation": 4,
        "split": "train",
        "features": {
            "hook": "preinstall",
            "unparseable": False,
            "entropy": 6.0,
            "source_length": 500,
            "eval_count": 1,
            "function_ctor_count": 0,
            "spawn_count": 2,
            "http_count": 2,
            "fs_count": 1,
            "homedir_count": 1,
            "credential_hits": 2,
            "api_text_hits": 3,
            "download_and_execute": True,
            "ident_mean_length": 2.0,
            "suspicion_score": 20.0,
        },
    }

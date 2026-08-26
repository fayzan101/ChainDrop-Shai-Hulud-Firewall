"""Map a Phase-2 feature object into a fixed-length numeric vector."""

from __future__ import annotations

from typing import Any

from classifier.schema import FEATURE_KEYS, HOOKS


def features_to_vector(features: dict[str, Any]) -> list[float]:
    hook = features.get("hook") or "install"
    row: dict[str, float] = {
        "entropy": float(features.get("entropy") or 0.0),
        "source_length": float(features.get("source_length") or 0.0),
        "eval_count": float(features.get("eval_count") or 0.0),
        "function_ctor_count": float(features.get("function_ctor_count") or 0.0),
        "spawn_count": float(features.get("spawn_count") or 0.0),
        "http_count": float(features.get("http_count") or 0.0),
        "fs_count": float(features.get("fs_count") or 0.0),
        "homedir_count": float(features.get("homedir_count") or 0.0),
        "credential_hits": float(features.get("credential_hits") or 0.0),
        "api_text_hits": float(features.get("api_text_hits") or 0.0),
        "download_and_execute": 1.0 if features.get("download_and_execute") else 0.0,
        "ident_mean_length": float(features.get("ident_mean_length") or 0.0),
        "unparseable": 1.0 if features.get("unparseable") else 0.0,
        "suspicion_score": float(features.get("suspicion_score") or 0.0),
        "hook_preinstall": 0.0,
        "hook_install": 0.0,
        "hook_postinstall": 0.0,
    }
    if hook in HOOKS:
        row[f"hook_{hook}"] = 1.0
    else:
        row["hook_install"] = 1.0
    return [row[k] for k in FEATURE_KEYS]

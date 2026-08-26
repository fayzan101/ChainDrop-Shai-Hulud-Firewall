"""Feature keys aligned with classifier/features.mjs (feature_schema_version 1.0.0)."""

from __future__ import annotations

FEATURE_SCHEMA_VERSION = "1.0.0"
MODEL_VERSION = "triage-synth-0.1.0"

# Numeric columns used by the triage models (order is part of the schema).
FEATURE_KEYS: list[str] = [
    "entropy",
    "source_length",
    "eval_count",
    "function_ctor_count",
    "spawn_count",
    "http_count",
    "fs_count",
    "homedir_count",
    "credential_hits",
    "api_text_hits",
    "download_and_execute",
    "ident_mean_length",
    "unparseable",
    "suspicion_score",
    "hook_preinstall",
    "hook_install",
    "hook_postinstall",
]

HOOKS = ("preinstall", "install", "postinstall")
HELD_OUT_CAMPAIGN = "chaindrop"
TRAINABLE_CAMPAIGNS = frozenset({"shai-hulud", "shai-hulud-2.0", "mini-shai-hulud"})
TRIAGE_LABELS = ("benign", "suspicious", "escalate")

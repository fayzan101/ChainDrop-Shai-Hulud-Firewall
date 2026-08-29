"""Secret redaction before any LLM or embedding call."""

from __future__ import annotations

import re
from typing import Any

_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"ghp_[A-Za-z0-9]{20,}"), "ghp_[REDACTED]"),
    (re.compile(r"npm_[A-Za-z0-9]{20,}"), "npm_[REDACTED]"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "AKIA[REDACTED]"),
    (
        re.compile(r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"]?[^'\"\s]{8,}"),
        r"\1=[REDACTED]",
    ),
]


def redact_text(text: str) -> str:
    redacted = text
    for pattern, replacement in _PATTERNS:
        redacted = pattern.sub(replacement, redacted)
    return redacted


def redact_context(context: dict[str, Any]) -> dict[str, Any]:
    """Return a copy with string fields redacted."""
    out: dict[str, Any] = {}
    for key, value in context.items():
        if isinstance(value, str):
            out[key] = redact_text(value)
        elif isinstance(value, dict):
            out[key] = redact_context(value)
        else:
            out[key] = value
    return out

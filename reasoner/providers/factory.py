"""Load reasoner providers from env or explicit name."""

from __future__ import annotations

import os

from reasoner.providers.base import ReasonerProvider
from reasoner.providers.claude import ClaudeReasonerProvider, PROMPT_VERSION as CLAUDE_PROMPT
from reasoner.providers.fixture import FixtureReasonerProvider, PROMPT_VERSION as FIXTURE_PROMPT


def load_provider(name: str | None = None) -> ReasonerProvider:
    selected = (name or os.environ.get("REASONER_PROVIDER") or "fixture").strip().lower()
    if selected == "fixture":
        return FixtureReasonerProvider()
    if selected == "claude":
        return ClaudeReasonerProvider()
    raise ValueError(f"unknown REASONER_PROVIDER: {selected!r} (expected fixture|claude)")


def provider_prompt_version(provider: ReasonerProvider) -> str:
    if isinstance(provider, ClaudeReasonerProvider):
        return CLAUDE_PROMPT
    if isinstance(provider, FixtureReasonerProvider):
        return FIXTURE_PROMPT
    return FIXTURE_PROMPT


def provider_name(provider: ReasonerProvider) -> str:
    if isinstance(provider, ClaudeReasonerProvider):
        return "claude"
    if isinstance(provider, FixtureReasonerProvider):
        return "fixture"
    return "custom"

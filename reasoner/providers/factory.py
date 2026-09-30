"""Load reasoner providers from env or explicit name."""

from __future__ import annotations

import os

from reasoner.providers.base import ReasonerProvider
from reasoner.providers.claude import ClaudeReasonerProvider, PROMPT_VERSION as CLAUDE_PROMPT
from reasoner.providers.fixture import FixtureReasonerProvider, PROMPT_VERSION as FIXTURE_PROMPT


def load_provider(name: str | None = None) -> ReasonerProvider:
    """
    Select a reasoner provider by name or environment configuration.
    
    Parameters:
        name (str | None): Provider name to use. If omitted, the `REASONER_PROVIDER` environment variable is used, defaulting to `fixture`.
    
    Returns:
        ReasonerProvider: A fixture or Claude reasoner provider.
    
    Raises:
        ValueError: If the selected provider name is not `fixture` or `claude`.
    """
    selected = (name or os.environ.get("REASONER_PROVIDER") or "fixture").strip().lower()
    if selected == "fixture":
        return FixtureReasonerProvider()
    if selected == "claude":
        return ClaudeReasonerProvider()
    raise ValueError(f"unknown REASONER_PROVIDER: {selected!r} (expected fixture|claude)")


def provider_prompt_version(provider: ReasonerProvider) -> str:
    """Return the prompt version associated with a reasoner provider.
    
    Parameters:
        provider (ReasonerProvider): Provider whose prompt version is being identified.
    
    Returns:
        str: The Claude prompt version for Claude providers; the fixture prompt version for all other providers.
    """
    if isinstance(provider, ClaudeReasonerProvider):
        return CLAUDE_PROMPT
    if isinstance(provider, FixtureReasonerProvider):
        return FIXTURE_PROMPT
    return FIXTURE_PROMPT


def provider_name(provider: ReasonerProvider) -> str:
    """
    Identify the name of a reasoner provider implementation.
    
    Parameters:
    	provider (ReasonerProvider): The provider whose name to identify.
    
    Returns:
    	str: `"claude"` for Claude providers, `"fixture"` for fixture providers, or `"custom"` for other implementations.
    """
    if isinstance(provider, ClaudeReasonerProvider):
        return "claude"
    if isinstance(provider, FixtureReasonerProvider):
        return "fixture"
    return "custom"

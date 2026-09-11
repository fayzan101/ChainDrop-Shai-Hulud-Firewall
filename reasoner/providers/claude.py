"""Anthropic Claude provider behind the same verdict JSON schema."""

from __future__ import annotations

import json
import os
import re
from typing import Any
from urllib import error, request

from rag.redact import redact_context, redact_text
from reasoner.providers.base import parse_provider_payload
from reasoner.schema import ReasonerSchemaError

PROMPT_VERSION = "verdict-claude-0.1.0"
DEFAULT_MODEL = "claude-sonnet-4-20250514"
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

_JSON_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)

_SYSTEM_PROMPT = """You are a supply-chain security analyst for npm lifecycle scripts.
Describe attack techniques only — never reproduce, improve, or output runnable malware.
Respond with a single JSON object matching this schema (no markdown, no prose outside JSON):
{
  "risk_score": 0-100 integer,
  "action": "allow" | "quarantine" | "block",
  "attack_techniques": ["MITRE technique ids"],
  "matched_campaigns": ["campaign names from citations only"],
  "justification": "short technique-level explanation grounded in retrieved intelligence",
  "citations": [{"doc_id": "...", "title": "...", "url": null or string, "date": null or string}],
  "uncertainty": "low" | "medium" | "high"
}
Cite only doc_id values present in the retrieved intelligence excerpts."""


def _extract_json_text(content: str) -> str:
    fenced = _JSON_FENCE.search(content)
    if fenced:
        return fenced.group(1).strip()
    return content.strip()


def _redact_retrieved(retrieved: list[dict[str, Any]]) -> list[dict[str, Any]]:
    redacted: list[dict[str, Any]] = []
    for chunk in retrieved:
        entry = {
            "doc_id": chunk.get("doc_id"),
            "title": redact_text(str(chunk.get("title") or "")),
            "url": chunk.get("url"),
            "date": chunk.get("date"),
            "campaign_tags": chunk.get("campaign_tags") or [],
            "text": redact_text(str(chunk.get("text") or ""))[:1200],
        }
        redacted.append(entry)
    return redacted


def build_claude_prompt(
    summary: dict[str, Any],
    retrieved: list[dict[str, Any]],
    features: dict[str, Any],
) -> str:
    safe_summary = redact_context(summary)
    safe_features = redact_context(features)
    safe_retrieved = _redact_retrieved(retrieved)
    return (
        "Assess whether the observed npm lifecycle script behavior resembles documented "
        "Shai-Hulud-lineage supply-chain worm techniques.\n\n"
        f"Behavior summary (redacted):\n{json.dumps(safe_summary, indent=2)}\n\n"
        f"Static features (redacted):\n{json.dumps(safe_features, indent=2)}\n\n"
        f"Retrieved intelligence excerpts:\n{json.dumps(safe_retrieved, indent=2)}"
    )


class ClaudeReasonerProvider:
    """Production provider using Anthropic Messages API."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        timeout_s: float = 60.0,
    ) -> None:
        self._api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        self._model = model or os.environ.get("ANTHROPIC_MODEL") or DEFAULT_MODEL
        self._timeout_s = timeout_s

    def reason(
        self,
        summary: dict[str, Any],
        retrieved: list[dict[str, Any]],
        features: dict[str, Any],
    ) -> dict[str, Any]:
        if not self._api_key:
            raise ReasonerSchemaError("ANTHROPIC_API_KEY is not set")
        prompt = build_claude_prompt(summary, retrieved, features)
        raw = self._call_messages_api(prompt)
        return parse_provider_payload(_extract_json_text(raw))

    def _call_messages_api(self, user_prompt: str) -> str:
        payload = {
            "model": self._model,
            "max_tokens": 1024,
            "system": _SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            ANTHROPIC_API_URL,
            data=body,
            method="POST",
            headers={
                "content-type": "application/json",
                "x-api-key": self._api_key,
                "anthropic-version": ANTHROPIC_VERSION,
            },
        )
        try:
            with request.urlopen(req, timeout=self._timeout_s) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except error.HTTPError as err:
            detail = err.read().decode("utf-8", errors="replace")[:500]
            raise ReasonerSchemaError(
                f"Anthropic API HTTP {err.code}: {detail}"
            ) from err
        except error.URLError as err:
            raise ReasonerSchemaError(f"Anthropic API unreachable: {err}") from err

        blocks = data.get("content") or []
        text_parts = [
            block.get("text", "")
            for block in blocks
            if isinstance(block, dict) and block.get("type") == "text"
        ]
        if not text_parts:
            raise ReasonerSchemaError("Anthropic API returned no text content")
        return "\n".join(text_parts)

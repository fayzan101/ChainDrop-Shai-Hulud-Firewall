# Reasoner (Phase 6)

`BehaviorSummary` + schema-constrained verdict JSON. Production uses Claude behind the same contract ([ADR 0004](../docs/adr/0004-claude-for-verdicts.md)); CI uses `FixtureReasonerProvider`.

## Provider selection

| `REASONER_PROVIDER` | Use |
| --- | --- |
| `fixture` (default) | Deterministic CI / local scans — no API key |
| `claude` | Anthropic Messages API (`ANTHROPIC_API_KEY` required) |

```bash
# CI / default
REASONER_PROVIDER=fixture python -m reasoner.cli --documents fixtures/rag-corpus/documents.jsonl

# Production (secrets via env only — never commit keys)
REASONER_PROVIDER=claude ANTHROPIC_API_KEY=... python -m reasoner.cli --documents fixtures/rag-corpus/documents.jsonl

# Optional live integration test (skipped in CI)
RUN_LIVE_LLM=1 ANTHROPIC_API_KEY=... python -m pytest reasoner/tests/test_claude_provider.py -k live -q
```

## Commands

```bash
echo '{"script_source":"...","features":{"suspicion_score":8}}' | python -m reasoner.cli --documents fixtures/rag-corpus/documents.jsonl
node action/scan-rag.mjs --dir fixtures/synthetic-suspicious --behavior-log fixtures/sandbox-canary-hit/behavior-log.example.json
```

## Invariants

- Invalid reasoner JSON ⇒ **quarantine** or **block** via `degraded_verdict`, never silent **allow** on escalated scripts.
- Prompts describe **techniques**, not reconstructing malware.
- `reasoner_status`: `ok` | `degraded` | `skipped`.

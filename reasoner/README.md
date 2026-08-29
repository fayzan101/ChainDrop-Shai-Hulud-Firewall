# Reasoner (Phase 6)

`BehaviorSummary` + schema-constrained verdict JSON. Production uses Claude behind the same contract ([ADR 0004](../docs/adr/0004-claude-for-verdicts.md)); CI uses `FixtureReasonerProvider`.

## Commands

```bash
echo '{"script_source":"...","features":{"suspicion_score":8}}' | python -m reasoner.cli --documents fixtures/rag-corpus/documents.jsonl
node action/scan-rag.mjs --dir fixtures/synthetic-suspicious --behavior-log fixtures/sandbox-canary-hit/behavior-log.example.json
```

## Invariants

- Invalid reasoner JSON ⇒ **quarantine** or **block** via `degraded_verdict`, never silent **allow** on escalated scripts.
- Prompts describe **techniques**, not reconstructing malware.
- `reasoner_status`: `ok` | `degraded` | `skipped`.

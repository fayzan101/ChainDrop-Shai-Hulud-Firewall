# HTTP API

NestJS service for org-mode persistence, dashboard, and optional remote sandbox orchestration. Local CI can skip this (classifier-only) per [github-action.md](github-action.md).

Base path: `/v1`. JSON only. Auth: bearer token (service) or session cookie (dashboard).

## Verdict object (canonical)

Produced by stage 7 and stored as-is (plus server fields).

```json
{
  "verdict_id": "01J...",
  "created_at": "2026-08-18T12:00:00Z",
  "repo": "acme/app",
  "sha": "abc123",
  "run_id": "123456",
  "package": "@scope/name",
  "version": "1.2.3",
  "hook": "preinstall",
  "script_sha256": "…",
  "risk_score": 87,
  "action": "block",
  "attack_techniques": ["T1195.002", "T1528", "T1567.001"],
  "matched_campaigns": ["shai-hulud-2.0"],
  "justification": "Behavior summary matches documented preinstall loader + credential harvest + registry republish probes.",
  "citations": [
    {
      "doc_id": "…",
      "title": "Shai-Hulud 2.0 npm worm",
      "url": "https://securitylabs.datadoghq.com/articles/shai-hulud-2.0-npm-worm/",
      "date": "2025-11-24"
    }
  ],
  "uncertainty": "low",
  "reasoner_status": "ok",
  "model_version": "xgb-2026-10-01",
  "feature_schema_version": "1.0.0",
  "corpus_version": "no-chaindrop",
  "prompt_version": "verdict-3",
  "classifier_label": "escalate",
  "sandbox": {
    "timeout": false,
    "canary_hits": ["npm_token"],
    "egress_count": 3
  },
  "degraded": false
}
```

JSON Schema (draft 2020-12) will live at `docs/schemas/verdict.schema.json` when code lands. Until then this object is the contract.

`reasoner_status`: `ok` | `degraded` | `skipped`.

## Endpoints

### `POST /v1/scans`

Start or record a scan from the Action.

**Body:** `{ "repo", "sha", "run_id", "lockfile_digest", "scripts": [ /* ScriptBundle */ ] }`  
**Response:** `{ "scan_id", "verdicts": [ Verdict ] }`  
Idempotent on `(run_id, lockfile_digest)` when possible.

### `GET /v1/scans/:scan_id`

Full scan including all per-script verdicts.

### `GET /v1/verdicts`

Query: `action`, `repo`, `from`, `to`, `campaign`, `cursor`. Analyst queue.

### `GET /v1/verdicts/:verdict_id`

Single verdict + links to redacted logs (not raw script if policy forbids).

### `POST /v1/verdicts/:verdict_id/feedback`

```json
{
  "label": "confirm-malicious | false-positive | needs-more-data",
  "comment": "optional",
  "analyst": "alice"
}
```

Must not change `split=heldout` membership.

### `GET /v1/corpus/health`

```json
{
  "corpus_version": "no-chaindrop",
  "document_count": 120,
  "chaindrop_documents": 0,
  "embedded_at": "2026-10-01T00:00:00Z"
}
```

Evaluation CI asserts `chaindrop_documents === 0` for the experimental pin.

### `GET /v1/metrics`

Prometheus scrape is preferred (`/metrics`). This JSON endpoint is for the dashboard: scan volume, block rate, p95 latency, escalation rate.

## Errors

| HTTP | Meaning |
| --- | --- |
| 400 | Schema validation (including invalid reasoner JSON from an internal job) |
| 401 | Missing/invalid token |
| 409 | Scan already finalized |
| 503 | Sandbox pool exhausted; Action should quarantine, not allow |

## Privacy

Logs stored through the API are redacted. `script_sha256` is stored; raw bytes optional and retention-limited. LLM request bodies are hashed, not kept in PostgreSQL by default.

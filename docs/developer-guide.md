# Developer guide

How to extend SentryHulud without breaking the held-out experiment or the sandbox boundary. Read [CONTRIBUTING.md](../CONTRIBUTING.md) and [architecture.md](architecture.md) first.

## Repository map (planned)

| Path | Owner stage | Language |
| --- | --- | --- |
| `action/` | 1, 8 | TypeScript |
| `classifier/` | 2, 3 | Python |
| `sandbox/` | 4 | Docker + capture agent |
| `rag/` | 6 | Python |
| `reasoner/` | 5, 7 | Python or TS |
| `api/` | 8, 9 | NestJS |
| `dashboard/` | 9 | Next.js |
| `eval/` | FR-EV | Python |
| `data/` | metadata only in git | JSONL |

## Adding a static feature

1. Add a deterministic function in `classifier/features/` with a unit test on a **synthetic** script.
2. Bump `feature_schema_version`.
3. Retrain; do not mix old vectors with a new schema.
4. If the feature encodes a ChainDrop-only IOC (contract address, specific filename from August 2026), keep it out of the **evaluation** model. Production models after freeze may include it — behind a `model_family` flag.

## Changing the classifier

- Train only on `split in {train}` with `campaign != chaindrop`.
- Record seed, library versions, and `model_version`.
- Export SHAP only for blocked/quarantined cases in production.

## Sandbox changes

Any extra mount, capability, or egress is a security review. Tests should include:

- Canary file is visible inside, not on the host
- Outbound TCP never hits the real network
- Container removed after run (even on crash)

Do not copy real `~/.npmrc` into the image "to be realistic." Mirror **paths**, not secrets.

## RAG ingest

```bash
python rag/ingest.py --url-list data/corpus/urls.txt --corpus-version no-chaindrop
```

Ingest must drop documents with `exclude_from_heldout_corpus` or `campaign_tags` containing `chaindrop` when that version is requested.

Chunk metadata required: `campaign`, `technique`, `published_at`, `doc_id`.

## Reasoner prompts

Prompts live in `reasoner/prompts/` and are versioned (`prompt_version`). Changes require:

- Schema still validates ([api.md](api.md))
- Instruction: provenance is not exculpatory
- Instruction: cite or raise `uncertainty`
- No request to emit exploit code

## Policy thresholds

Configured in YAML (`action/policy.default.yaml`), not in the prompt. Tests should cover score 39 / 40 / 80 / 81 boundaries and hard-trip canary exfil.

## Dashboard feedback

POST `/verdicts/:id/feedback` only. Do not write to the vector DB from the browser. Analyst notes that should enter the corpus go through a reviewed ingest PR.

## Running a single stage locally

Until the CLI exists, prefer unit tests per package. Target UX:

```bash
sentryhulud extract --lockfile ./package-lock.json > bundle.json
sentryhulud classify --bundle bundle.json
sentryhulud sandbox --script-id ...   # only on sandbox host
sentryhulud verdict --bundle bundle.json --log behavior.json
```

## Debugging false positives

1. Look at stage-3 score and SHAP.
2. If escalated, read `BehaviorLog` — did we sinkhole a legitimate telemetry URL?
3. Inspect citations — wrong campaign chunk?
4. File a feedback label; do not hot-patch thresholds on a single package.

## What not to implement

- Public npm publish helpers
- GNN blast-radius (out of scope)
- Automatic GitHub takedown
- Un-sandboxed `eval` of captured scripts "just this once"

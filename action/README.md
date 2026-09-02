# SentryHulud GitHub Action

Lifecycle-script firewall for npm CI. Evaluation configurations:

| `config` | Pipeline |
| --- | --- |
| `a` (default) | Classifier-only — intercept → ML triage (or heuristic fallback) → policy |
| `b` | ML triage + sandbox dry-run → `BehaviorLog` heuristics |
| `c` | ML triage + sandbox + RAG reasoner (`corpus-version: no-chaindrop`) |

**Does not execute** `preinstall` / `install` / `postinstall` on the host.

## Use in a workflow

Pin to a commit SHA (not `main`):

```yaml
- uses: fayzan101/ChainDrop-Shai-Hulud-Firewall/action@<full-commit-sha>
  with:
    config: c
    working-directory: .
    fail-open: "false"
    threshold-quarantine: "40"
    threshold-block: "80"
    corpus-version: no-chaindrop
    verdict-path: sentryhulud-verdict.json
```

Config **(b)** requires Docker on the runner. All configs train/load `classifier/artifacts/triage.joblib` when Python is available; without the artifact, scans fall back to Phase-2 heuristic scoring (`features-heuristic-0.1.0`).

## Local CLI

```bash
python -m classifier.train   # once, writes classifier/artifacts/triage.joblib
node action/scan.mjs --dir fixtures/benign-lockfile
node action/scan-sandbox.mjs --dir fixtures/synthetic-suspicious --no-sandbox
node action/scan-rag.mjs --dir fixtures/synthetic-suspicious
```

## Inputs / outputs

See `action.yml` and [docs/github-action.md](../docs/github-action.md).

Ablation matrix CI: `.github/workflows/sentryhulud-ablation.yml`.

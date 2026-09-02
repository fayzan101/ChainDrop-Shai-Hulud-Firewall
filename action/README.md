# SentryHulud GitHub Action

Lifecycle-script firewall for npm CI. Evaluation configurations:

| `config` | Pipeline |
| --- | --- |
| `a` (default) | Classifier-only — intercept → static features → policy |
| `b` | Classifier + sandbox dry-run → `BehaviorLog` heuristics |
| `c` | Classifier + sandbox + RAG reasoner (`corpus-version: no-chaindrop`) |

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

Config **(b)** requires Docker on the runner. Config **(c)** requires Python 3.11+ (the Action installs `numpy` for the reasoner path).

## Local CLI

```bash
node action/scan.mjs --dir fixtures/benign-lockfile
node action/scan-sandbox.mjs --dir fixtures/synthetic-suspicious --no-sandbox
node action/scan-rag.mjs --dir fixtures/synthetic-suspicious
```

## Inputs / outputs

See `action.yml` and [docs/github-action.md](../docs/github-action.md).

Ablation matrix CI: `.github/workflows/sentryhulud-ablation.yml`.

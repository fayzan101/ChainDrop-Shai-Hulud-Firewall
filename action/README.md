# SentryHulud GitHub Action (Phase 4)

Classifier-only CI gate (evaluation config **a**): intercept → static features → allow / quarantine / block.

**Does not execute** `preinstall` / `install` / `postinstall`.

## Use in a workflow

Pin to a commit SHA (not `main`):

```yaml
- uses: fayzan101/ChainDrop-Shai-Hulud-Firewall/action@<full-commit-sha>
  with:
    working-directory: .
    fail-open: "false"
    threshold-quarantine: "40"
    threshold-block: "80"
    verdict-path: sentryhulud-verdict.json
```

## Local CLI

```bash
node action/scan.mjs --dir fixtures/benign-lockfile --out /tmp/allow.json
node action/scan.mjs --dir fixtures/synthetic-suspicious --out /tmp/block.json
# exit 0 allow · exit 1 quarantine/block
```

## Inputs / outputs

See `action.yml` and [docs/github-action.md](../docs/github-action.md).

Sandbox and RAG are off in this phase (`pipeline: classifier-only`).

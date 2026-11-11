# GitHub Action

Composite Action that gates npm CI on lifecycle-script risk. **Default posture:** fail closed, never execute install hooks on the host/runner, never pass `GITHUB_TOKEN` into the sandbox.

## Required CI order (npm)

The interceptor only reads `package.json` files that are **already on disk**. Before `npm ci` (without `--ignore-scripts`), `node_modules` is empty and any lockfile entry with `hasInstallScript: true` causes a **fail-closed** error. After a normal `npm ci`, lifecycle scripts have already run.

Use this order:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm

      # 1) Unpack deps without running lifecycle scripts
      - run: npm ci --ignore-scripts

      # 2) Scan scripts that are now on disk (never executes them)
      - uses: fayzan101/ChainDrop-Shai-Hulud-Firewall/action@<full-commit-sha>
        with:
          working-directory: .
          fail-open: "false"
          threshold-quarantine: "40"
          threshold-block: "80"
          verdict-path: sentryhulud-verdict.json

      # 3) Only if the Action allowed: run deferred install scripts
      - run: npm rebuild
        if: success()

      - run: npm test
        if: success()
```

## Lockfile support

| Lockfile | Gate behavior |
| --- | --- |
| `package-lock.json` / `npm-shrinkwrap.json` | Supported. Missing on-disk `package.json` for any `hasInstallScript: true` entry ⇒ fail closed. |
| `pnpm-lock.yaml` / `yarn.lock` | **Fail closed** until dependency enumeration / tarball fetch lands. Use npm lockfiles for the CI gate. |

## Local equivalent

```bash
npm ci --ignore-scripts
node action/scan.mjs --dir . --out sentryhulud-verdict.json          # config (a)
node action/scan-sandbox.mjs --dir . --out sentryhulud-verdict.json  # config (b)
node action/scan-rag.mjs --dir . --out sentryhulud-verdict.json      # config (c)
```

Configs **(a)/(b)/(c)** load the shipped `classifier/artifacts/triage.joblib` (pinned Python deps in `classifier/requirements.txt`). Action install uses `npm ci --ignore-scripts`. Config **(b)** sets `degraded: true` when Docker is unavailable and escalation was required.

Until the Action is published under a release tag, pin a commit SHA as above.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `config` | no | `a` | `a` (classifier) \| `b` (sandbox) \| `c` (rag) |
| `lockfile` | no | auto-detect | Path to lockfile |
| `corpus-version` | no | `no-chaindrop` | RAG corpus pin for config **(c)** |
| `threshold-quarantine` | no | `40` | Inclusive lower bound |
| `threshold-block` | no | `80` | Scores `>` this block |
| `fail-open` | no | `false` | If true, interceptor errors warn only (not recommended) |
| `sandbox` | no | `true` | Sandbox dry-run for config **(b)** |
| `working-directory` | no | `.` | Monorepo package path |

Exact bound inclusivity must match [srs.md](srs.md): `< 40` allow, `40–80` quarantine, `> 80` block.

## Outputs

| Output | Description |
| --- | --- |
| `action` | `allow` \| `quarantine` \| `block` |
| `risk_score` | 0–100 |
| `verdict_path` | Path to `sentryhulud-verdict.json` |
| `degraded` | `true` if sandbox skipped (no Docker) or fail-open recovered |

## Permissions

The Action needs `contents: read`. It must **not** request `id-token: write` unless you are separately using npm trusted publishing in a **different** job that does not share a filesystem with the sandbox.

Never mount `~/.npm` from the runner into the sandbox container.

## Failure semantics

| Situation | `fail-open=false` | `fail-open=true` |
| --- | --- | --- |
| No lockfile | step failure | warn, skip scan |
| `hasInstallScript` package not on disk | step failure | warn |
| yarn/pnpm lockfile | step failure | warn |
| Sandbox / Docker unavailable (config b escalate) | `degraded=true`, classifier policy | same |
| LLM down | heuristic policy | heuristic policy |
| `action=block` | step failure | step failure (policy still applies) |

## Artifacts

Upload `sentryhulud-verdict.json` and (if present) redacted `BehaviorLog` with secrets stripped. Retention: follow org policy (e.g. 30 days).

## Composite vs JS

Semester 1 ships a composite Action that calls Node and Python via `actions/setup-python`. Semester 2 should bundle a single JS Action plus the prebuilt classifier to cut setup time (NFR-01).

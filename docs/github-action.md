# GitHub Action

Composite or JavaScript Action that wraps dependency installation for npm/yarn/pnpm projects.

**Default posture:** fail closed, do not execute lifecycle scripts until policy says `allow`, never pass `GITHUB_TOKEN` into the sandbox.

## Example workflow

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

      - uses: <org>/Sentryhulud@<full-commit-sha>
        with:
          package-manager: npm
          lockfile: package-lock.json
          api-url: ${{ secrets.SENTRYHULUD_API_URL }}
          api-token: ${{ secrets.SENTRYHULUD_API_TOKEN }}
          corpus-version: production
          threshold-quarantine: "40"
          threshold-block: "80"
          fail-open: "false"

      - run: npm test
        if: success()
```

Until the Action is published, this file is the contract implementers must satisfy.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `package-manager` | no | `npm` | `npm` \| `yarn` \| `pnpm` |
| `lockfile` | no | auto-detect | Path to lockfile |
| `api-url` | no | empty | If empty, run classifier locally and skip org persistence |
| `api-token` | no | empty | Auth to NestJS API |
| `corpus-version` | no | `production` | Vector index pin |
| `threshold-quarantine` | no | `40` | Inclusive lower bound |
| `threshold-block` | no | `80` | Exclusive of quarantine band; scores `>` this block |
| `fail-open` | no | `false` | If true, interceptor errors warn only (not recommended) |
| `sandbox` | no | `true` | If false, configuration (a) only — research/debug |
| `rag` | no | `true` | If false with sandbox true, configuration (b) |
| `working-directory` | no | `.` | Monorepo package path |

Exact bound inclusivity must match [srs.md](srs.md): `< 40` allow, `40–80` quarantine, `> 80` block.

## Outputs

| Output | Description |
| --- | --- |
| `action` | `allow` \| `quarantine` \| `block` |
| `risk_score` | 0–100 (max across scripts, or graph aggregate — document in implementation) |
| `verdict_path` | Path to `sentryhulud-verdict.json` |
| `degraded` | `true` if LLM/vector store failed |

## Permissions

The Action needs `contents: read`. It must **not** request `id-token: write` unless you are separately using npm trusted publishing in a **different** job that does not share a filesystem with the sandbox.

Never mount `~/.npm` from the runner into the sandbox container.

## Failure semantics

| Situation | `fail-open=false` | `fail-open=true` |
| --- | --- | --- |
| No lockfile | step failure | warn, skip scan |
| Sandbox crash | quarantine | warn |
| LLM down | heuristic policy | heuristic policy |
| `action=block` | step failure | step failure (policy still applies) |

## Artifacts

Upload `sentryhulud-verdict.json` and (if present) redacted `BehaviorLog` with secrets stripped. Retention: follow org policy (e.g. 30 days).

## Composite vs JS

Semester 1 may ship a composite Action that calls Node and Python via `actions/setup-python`. Semester 2 should bundle a single JS Action plus a prebuilt classifier to cut setup time (NFR-01).

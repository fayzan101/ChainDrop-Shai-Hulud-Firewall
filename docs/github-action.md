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

      - uses: fayzan101/ChainDrop-Shai-Hulud-Firewall/action@<full-commit-sha>
        with:
          working-directory: .
          fail-open: "false"
          threshold-quarantine: "40"
          threshold-block: "80"
          verdict-path: sentryhulud-verdict.json

      - run: npm test
        if: success()
```

Local equivalent:

```bash
node action/scan.mjs --dir . --out sentryhulud-verdict.json          # config (a)
node action/scan-sandbox.mjs --dir . --out sentryhulud-verdict.json  # config (b)
node action/scan-rag.mjs --dir . --out sentryhulud-verdict.json      # config (c)
```

The composite Action selects the scan via the `config` input (`a` | `b` | `c`). Config **(b)** builds the sandbox image when Docker is available; config **(c)** runs the fixture reasoner with `corpus-version: no-chaindrop`.

Until the Action is published under a release tag, pin a commit SHA as above.


## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `config` | no | `a` | `a` (classifier) \| `b` (sandbox) \| `c` (rag) |
| `package-manager` | no | `npm` | `npm` \| `yarn` \| `pnpm` |
| `lockfile` | no | auto-detect | Path to lockfile |
| `api-url` | no | empty | If empty, run classifier locally and skip org persistence |
| `api-token` | no | empty | Auth to NestJS API |
| `corpus-version` | no | `no-chaindrop` | RAG corpus pin for config **(c)** |
| `threshold-quarantine` | no | `40` | Inclusive lower bound |
| `threshold-block` | no | `80` | Exclusive of quarantine band; scores `>` this block |
| `fail-open` | no | `false` | If true, interceptor errors warn only (not recommended) |
| `sandbox` | no | `true` | Sandbox dry-run for config **(b)** |
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
